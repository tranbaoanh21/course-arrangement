FROM node:20.15-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci

COPY client ./client
COPY server ./server
RUN npm run build

FROM node:20.15-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/client/dist ./client/dist

USER node
EXPOSE 4000

CMD ["npm", "run", "start:production"]
