FROM node:22.14-slim

WORKDIR /app

# Only install what you actually need
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --legacy-peer-deps
RUN npx prisma generate
COPY . .
RUN npm run build
RUN npm prune --production

USER node
EXPOSE 3000
CMD ["npm", "start"]