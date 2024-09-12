FROM node:18

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 libsqlite3-dev

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install node-cache

# Copy the rest of the application
COPY . .

# Copy Google credentials
COPY ./secrets/google_credentials.json /app/secrets/google_credentials.json

# List installed packages for debugging
RUN npm list

EXPOSE 3001

CMD ["node", "src/server.js"]