FROM node:12.13-alpine

WORKDIR /typerunner

COPY . .

RUN npm i