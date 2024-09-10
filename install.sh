#!/bin/bash

# Determine the installation directory
INSTALL_DIR="$HOME/tiedottaja"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR" || exit

# Create .env file and add your API keys
cat << EOF > .env
OPENAI_API_KEY=your_actual_openai_api_key
TELEGRAM_BOT_TOKEN=your_actual_telegram_bot_token
TELEGRAM_CHANNEL_ID=your_actual_telegram_channel_id
REACT_APP_API_URL=http://localhost:3001
PORT=3001
EOF

# Create docker-compose.yml
cat << EOF > docker-compose.yml
version: '3'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=\${REACT_APP_API_URL}
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - PORT=\${PORT}
    env_file:
      - .env
EOF

# Create frontend structure
mkdir -p frontend/src frontend/public
cat > frontend/Dockerfile << EOF
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
EOF

cat > frontend/package.json << EOF
{
  "name": "message-handler-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@material-ui/core": "^4.12.4",
    "axios": "^0.21.1",
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-scripts": "4.0.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF

cat > frontend/src/App.js << EOF
import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Container, Typography, CircularProgress } from '@material-ui/core';

function App() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post('http://localhost:3001/api/process-message', { message });
      setResponse(res.data.message);
    } catch (error) {
      setResponse('Error processing message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        Message Handler
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          margin="normal"
        />
        <Button type="submit" variant="contained" color="primary" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : 'Submit'}
        </Button>
      </form>
      {response && (
        <Typography variant="body1" style={{ marginTop: 20 }}>
          {response}
        </Typography>
      )}
    </Container>
  );
}

export default App;
EOF

cat > frontend/public/index.html << EOF
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Message Handler</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
EOF

cat > frontend/src/index.js << EOF
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
EOF

# Create backend structure
mkdir -p backend/src
cat > backend/Dockerfile << EOF
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "src/server.js"]
EOF

cat > backend/package.json << EOF
{
  "name": "message-handler-backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^10.0.0",
    "express": "^4.17.1",
    "openai": "^3.1.0",
    "node-telegram-bot-api": "^0.54.0"
  }
}
EOF

cat > backend/src/server.js << EOF
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');
const { addToModerationQueue } = require('./telegramBot');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/api/process-message', async (req, res) => {
  try {
    const { message } = req.body;
    
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "You are a helpful assistant that summarizes and translates messages to English."},
        {role: "user", content: \`Summarize and translate to English: \${message}\`}
      ],
      max_tokens: 150
    });

    const processedMessage = completion.data.choices[0].message.content.trim();
    
    addToModerationQueue(processedMessage);
    
    res.json({ success: true, message: 'Message processed and sent for moderation' });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ success: false, message: 'Error processing message' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
EOF

cat > backend/src/telegramBot.js << EOF
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const moderationQueue = [];

bot.onText(/\/moderate/, (msg) => {
  const chatId = msg.chat.id;
  if (moderationQueue.length > 0) {
    const message = moderationQueue[0];
    bot.sendMessage(chatId, \`Message to moderate:\n\${message.text}\n\nApprove (/approve) or Reject (/reject)?\`);
  } else {
    bot.sendMessage(chatId, 'No messages to moderate.');
  }
});

bot.onText(/\/approve/, (msg) => {
  if (moderationQueue.length > 0) {
    const approvedMessage = moderationQueue.shift();
    bot.sendMessage(process.env.TELEGRAM_CHANNEL_ID, approvedMessage.text);
    bot.sendMessage(msg.chat.id, 'Message approved and sent to channel.');
  }
});

bot.onText(/\/reject/, (msg) => {
  if (moderationQueue.length > 0) {
    moderationQueue.shift();
    bot.sendMessage(msg.chat.id, 'Message rejected.');
  }
});

module.exports = {
  addToModerationQueue: (message) => {
    moderationQueue.push({ text: message });
  }
};
EOF

# Install dependencies
cd frontend && npm install
cd ../backend && npm install

echo "Setup complete. You can now run 'docker-compose up --build' to start the application."