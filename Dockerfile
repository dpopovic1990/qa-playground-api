
FROM node:24-alpine AS base

WORKDIR /app

COPY package*.json ./

FROM base AS development

RUN npm ci

COPY src ./src
COPY tests ./tests
COPY scripts ./scripts
COPY database ./database
COPY docs ./docs

FROM base AS production

RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY database ./database
COPY docs ./docs

EXPOSE 3000

CMD ["node", "src/server.js"]
