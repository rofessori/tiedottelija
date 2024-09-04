/* File: ~/tiedottaja/backend/src/server.js
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
        {role: "user", content: `Summarize and translate to English: ${message}`}
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

*/
