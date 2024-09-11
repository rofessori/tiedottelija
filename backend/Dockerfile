FROM node:18

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 libsqlite3-dev

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY ./secrets/google_credentials.json /app/secrets/google_credentials.json
EXPOSE 3001
CMD ["node", "src/server.js"]