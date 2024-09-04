FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY ./secrets/google_credentials.json /app/secrets/google_credentials.json
EXPOSE 3001
CMD ["node", "src/server.js"]
