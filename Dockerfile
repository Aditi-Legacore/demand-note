FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    NODE_ENV=production

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

# Copy frontend dependencies and run npm install before copying the full app
COPY frontend/frontend/package*.json ./frontend/
COPY frontend/frontend/prisma ./frontend/prisma
RUN cd frontend && npm install

# Copy the rest of the frontend source
COPY frontend/frontend ./frontend

# Generate Prisma client and build the Next.js app
RUN cd frontend && DATABASE_URL="postgresql://user:password@localhost:5432/db" npx prisma generate
RUN cd frontend && npm run build

WORKDIR /app/frontend

EXPOSE 3000

CMD ["npm", "start"]
