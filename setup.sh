#!/bin/bash

# Create frontend structure
mkdir -p frontend/src frontend/public
touch frontend/Dockerfile frontend/package.json frontend/src/App.js frontend/public/index.html

# Create backend structure
mkdir -p backend/src
touch backend/Dockerfile backend/package.json backend/src/server.js

# Create root level files
touch docker-compose.yml .env

# Populate frontend files
cat > frontend/Dockerfile << EOL
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
EOL

cat > frontend/package.json << EOL
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
EOL

cat > frontend/src/App.js << EOL
import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Container, Typography } from '@material-ui/core';

function App() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3001/api/process-message', { message });
      setResponse(res.data.message);
    } catch (error) {
      setResponse('Error processing message');
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
        <Button type="submit" variant="contained" color="primary">
          Submit
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
EOL

cat > frontend/public/index.html << EOL
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Message Handler</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOL

# Populate backend files
cat > backend/Dockerfile << EOL
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "src/server.js"]
EOL

cat > backend/package.json << EOL
{
  "name": "message-handler-backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^10.0.0",
    "express": "^4.17.1"
  }
}
EOL

cat > backend/src/server.js << EOL
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/process-message', (req, res) => {
  const { message } = req.body;
  console.log('Received message:', message);
  
  // Mock processing
  const processedMessage = \`Processed: \${message}\`;
  
  // Mock sending to Telegram
  console.log('Sending to Telegram:', processedMessage);
  
  res.json({ success: true, message: 'Message processed and sent for moderation' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
EOL

# Populate root level files
cat > docker-compose.yml << EOL
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
EOL

cat > .env << EOL
REACT_APP_API_URL=http://localhost:3001
PORT=3001
EOL

echo "Project setup complete in ~/tiedottaja"
