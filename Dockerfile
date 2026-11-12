
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY database ./database
COPY docs ./docs

EXPOSE 3000

CMD ["node", "src/server.js"]
