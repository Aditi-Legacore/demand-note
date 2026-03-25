FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma first
COPY prisma ./prisma

# Generate prisma client
RUN npx prisma generate

# Copy rest of code
COPY . .

# Build next app
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm","start"]