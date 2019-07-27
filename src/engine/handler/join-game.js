const Player = require('../game/player')
const { singleTargetMessage, multiTargetMessage } = require('../../message/socket-message')

class JoinGameHandler {
  constructor(games, messagesToSocketStream$) {
    this.games = games
    this.messagesToSocketStream$ = messagesToSocketStream$
  }

  handle(message) {
    const game = this.games.findOpenGame() || this.games.newGame()
      .on('countdown-finished', () => {
        this.games.run(game.getId())
        this.messagesToSocketStream$.next(multiTargetMessage(game.getPlayers().map(player => player.id), 'start-game', {
          gameId: game.getId()
        }))
      }) 
      .on('game-locked', text => {
        this.messagesToSocketStream$.next(multiTargetMessage(game.getPlayers().map(player => player.id), 'text-drawn', {
          gameId: game.getId(),
          text,
          maxGameLength: game.maxGameLength
        }))
      })
      .on('countdown-stopped', () => {
        this.messagesToSocketStream$.next(multiTargetMessage(game.getPlayers().map(player => player.id), 'reset-countdown', {
          gameId: game.getId()
        }))
      })
      .on('countdown-tick', () => {
        this.messagesToSocketStream$.next(multiTargetMessage(game.getPlayers().map(player => player.id), 'countdown-tick', {
          gameId: game.getId(),
          countdown: game.currentCountdown
        }))
      })
      .on('game-time-tick', () => {
        this.messagesToSocketStream$.next(multiTargetMessage(game.getPlayers().map(player => player.id), 'game-time-sync', {
          gameId: game.getId(),
          gameLength: game.gameLength
        }))
      })
      .on('game-time-finished', () => {
        this.messagesToSocketStream$.next(multiTargetMessage(game.getPlayers().map(player => player.id), 'game-finished', {
          gameId: game.getId(),
        }))
      })

    const newPlayer = new Player(message.socketId, message.payload.name)

    game.addPlayer(newPlayer)

    const players = game.getPlayers().map(player => player.id);

    this.messagesToSocketStream$.next(singleTargetMessage(newPlayer.id, 'joined-game', {
      id: game.getId(),
      players: game.getPlayers(),
      countdown: game.currentCountdown
    }))

    this.messagesToSocketStream$.next(multiTargetMessage(players.filter(player => player !== newPlayer.id), 'player-joined', {
      gameId: game.getId(),
      player: newPlayer
    }))

    if (game.hasEnoughPlayers() && !game.isRunning()) {
      game.startPreLockCountdown()

      this.messagesToSocketStream$.next(multiTargetMessage(players, 'start-countdown', {
        gameId: game.getId(),
        countdown: game.currentCountdown
      }))
    }
  }
}

module.exports = JoinGameHandler