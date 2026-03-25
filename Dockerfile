FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma

# Copy env file (important)
COPY .env .env

RUN npx prisma generate

COPY . .

RUN npm run build