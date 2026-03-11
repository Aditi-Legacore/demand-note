FROM node:24-slim

WORKDIR /app/frontend

# copy the source tree so the Next.js project is available inside the container
COPY frontend/ .

# start from a completely clean slate, then install dependencies and build
RUN rm -rf node_modules package-lock.json
RUN npm install
RUN npm run build
RUN npm run dev

ENV NODE_ENV=development
EXPOSE 3000

CMD ["npm", "run", "dev"]
