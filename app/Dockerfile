FROM node:16

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD node -r esbuild-register app.ts

