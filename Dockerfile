FROM python:3.11-slim

ARG DATABASE_URL="postgresql://user:password@localhost:5432/db"
ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    NODE_ENV=production \
    DATABASE_URL=${DATABASE_URL}

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        build-essential \
        libglib2.0-0 \
        libsm6 \
        libxrender1 \
        libxext6 \
        libgl1 \
        libgtk-3-0 \
        tesseract-ocr \
        poppler-utils && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend code and install Python requirements
COPY backend ./backend
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy frontend dependencies manifest
COPY frontend/package*.json ./frontend/
COPY frontend/prisma ./frontend/prisma

# Install Node deps (include devDependencies for Prisma) before copying full source
RUN cd frontend && NODE_ENV=development npm install

# Copy remaining frontend files
COPY frontend ./frontend

# Generate Prisma client and build the Next.js app
RUN cd frontend && NODE_ENV=production npx prisma generate
RUN cd frontend && NODE_ENV=production npm run build

WORKDIR /app/frontend

EXPOSE 3000

CMD ["npm", "start"]
