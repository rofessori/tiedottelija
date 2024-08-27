FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/secrets
EXPOSE 3001
CMD ["node", "src/server.js"]