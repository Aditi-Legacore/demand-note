FROM node:22.14-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Install TypeScript manually before build
RUN npm install --save-dev typescript @types/node @types/react @types/react-dom

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

USER node
EXPOSE 3000
CMD ["npm", "start"]