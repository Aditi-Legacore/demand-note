FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema first
COPY prisma ./prisma

# Set dummy DB URL (only needed for prisma generate)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"

# Generate Prisma client
RUN npx prisma generate

# Copy rest of app
COPY . .

# Build app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "start"]