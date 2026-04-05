FROM node:20-alpine

WORKDIR /app

# Installer le client Docker CLI pour interagir avec le daemon
RUN apk add --no-cache docker-cli python3 py3-pip bash

COPY package.json ./
RUN npm install --production

COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/index.js"]
