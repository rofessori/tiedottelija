# Navigate to your project directory
cd ~/tiedottaja

# Create .env file (if not exists) and add your API keys
cat << EOF > .env
OPENAI_API_KEY=your_actual_openai_api_key
TELEGRAM_BOT_TOKEN=your_actual_telegram_bot_token
TELEGRAM_CHANNEL_ID=your_actual_telegram_channel_id
EOF

# Create docker-compose.yml
cat << EOF > docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
    env_file:
      - .env
EOF

# Create frontend Dockerfile
mkdir -p frontend
cat << EOF > frontend/Dockerfile
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
EOF

# Create backend Dockerfile
mkdir -p backend
cat << EOF > backend/Dockerfile
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "src/server.js"]
EOF

# Install dependencies for backend
cd backend
npm init -y
npm install express cors dotenv openai node-telegram-bot-api

# Create backend files
mkdir src
cat << EOF > src/server.js
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

cat << EOF > src/telegramBot.js
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

cd ..

# Install dependencies for frontend
cd frontend
npm init -y
npm install react react-dom @material-ui/core axios

# Create frontend files
mkdir src public
cat << EOF > public/index.html
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

cat << EOF > src/App.js
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

cat << EOF > src/index.js
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

cd ..

# Build and run the Docker containers
docker-compose up --build
