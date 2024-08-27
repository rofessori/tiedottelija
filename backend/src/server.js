const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const OpenAI = require('openai');
const TelegramBot = require('node-telegram-bot-api');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const readSecret = (filepath) => fs.readFileSync(filepath, 'utf8').trim();

const openai = new OpenAI({
  apiKey: readSecret(process.env.OPENAI_API_KEY_FILE),
});

const bot = new TelegramBot(readSecret(process.env.TELEGRAM_BOT_TOKEN_FILE), { polling: true });
const TELEGRAM_CHANNEL_ID = readSecret(process.env.TELEGRAM_CHANNEL_ID_FILE);

const userStates = {};

const generateAnnouncement = async (message) => {
  const prompt = `You are a skilled journalist tasked with creating a concise and engaging announcement for a student organization event. Your goal is to transform the given lengthy input into a clear, informative, and brief announcement. The announcement should follow this format:

🇫🇮 [EVENT SHORT HEADLINE IN FINNISH]
[Event info in Finnish, short and informative, like a piece of news. Include up to two relevant emojis.]

---

🇬🇧 [SHORT HEADLINE IN ENGLISH]
[Same information as above but in English. When referring to the student organization Hiukkanen, use "Hiukkanens" as the English plural form.]

Use the following information to create the announcement:
${message}

Ensure the announcement is concise (aim for around 100-150 words total), informative, and engaging. Capture the essence of the event without including every detail. Focus on the most important information that would attract potential attendees.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
  });

  return completion.choices[0].message.content.trim();
};

app.post('/api/process-message', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Received message:', message);
    const announcement = await generateAnnouncement(message);
    console.log('Generated announcement:', announcement);

    const sentMessage = await bot.sendMessage(TELEGRAM_CHANNEL_ID, 
      `New announcement for moderation:\n\n${announcement}\n\nReact with 👍 to approve or 👎 to reject.`
    );
    console.log('Sent to Telegram:', sentMessage);

    await bot.sendMessage(TELEGRAM_CHANNEL_ID, '👍 👎', {
      reply_to_message_id: sentMessage.message_id,
      reply_markup: {
        force_reply: true
      }
    });

    res.json({ success: true, message: announcement });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ success: false, message: 'Error processing message', error: error.message });
  }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = { step: 'initial' };
  bot.sendMessage(chatId, 
    "Welcome to the Announcement Generator Bot! Here are the available commands:\n\n" +
    "/start - Start the bot and see this message\n" +
    "/generate - Start generating a new announcement\n" +
    "/help - See this message again\n\n" +
    "To begin, use the /generate command."
  );
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    "Here are the available commands:\n\n" +
    "/start - Start the bot and see this message\n" +
    "/generate - Start generating a new announcement\n" +
    "/help - See this message again\n\n" +
    "To begin, use the /generate command."
  );
});

bot.onText(/\/generate/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = { step: 'awaiting_input' };
  bot.sendMessage(chatId, "Please provide the details for your announcement. You can enter up to 10,000 characters:");
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  
  if (!userStates[chatId] || msg.text.startsWith('/')) return;

  switch (userStates[chatId].step) {
    case 'awaiting_input':
      if (msg.text.length > 10000) {
        bot.sendMessage(chatId, "Your input is too long. Please provide a shorter version (max 10,000 characters).");
        return;
      }
      userStates[chatId].input = msg.text;
      userStates[chatId].step = 'confirming_input';
      bot.sendMessage(chatId, `I've received your input (${msg.text.length} characters). Would you like to generate the announcement now? Reply with 'Yes' to proceed or 'No' to re-enter.`);
      break;

    case 'confirming_input':
      if (msg.text.toLowerCase() === 'yes') {
        bot.sendMessage(chatId, "Generating announcement...");
        try {
          const announcement = await generateAnnouncement(userStates[chatId].input);
          bot.sendMessage(chatId, `Here's the generated announcement:\n\n${announcement}\n\nIs this okay? Reply with 'Yes' to send for moderation or 'No' to start over.`);
          userStates[chatId].step = 'confirming_announcement';
          userStates[chatId].announcement = announcement;
        } catch (error) {
          console.error('Error generating announcement:', error);
          bot.sendMessage(chatId, "An error occurred while generating the announcement. Please try again later.");
          delete userStates[chatId];
        }
      } else if (msg.text.toLowerCase() === 'no') {
        bot.sendMessage(chatId, "Okay, please provide the details for your announcement again:");
        userStates[chatId].step = 'awaiting_input';
      } else {
        bot.sendMessage(chatId, "Please reply with 'Yes' or 'No'.");
      }
      break;

    case 'confirming_announcement':
      if (msg.text.toLowerCase() === 'yes') {
        const sentMessage = await bot.sendMessage(TELEGRAM_CHANNEL_ID, 
          `New announcement for moderation:\n\n${userStates[chatId].announcement}\n\nReact with 👍 to approve or 👎 to reject.`
        );
        await bot.sendMessage(TELEGRAM_CHANNEL_ID, '👍 👎', {
          reply_to_message_id: sentMessage.message_id,
          reply_markup: {
            force_reply: true
          }
        });
        bot.sendMessage(chatId, "Announcement sent for moderation. Thank you!");
        delete userStates[chatId];
      } else if (msg.text.toLowerCase() === 'no') {
        bot.sendMessage(chatId, "Okay, let's start over. Please provide the details for your announcement:");
        userStates[chatId].step = 'awaiting_input';
      } else {
        bot.sendMessage(chatId, "Please reply with 'Yes' or 'No'.");
      }
      break;
  }
});

bot.on('callback_query', async (callbackQuery) => {
  try {
    const messageId = callbackQuery.message.reply_to_message.message_id;
    const action = callbackQuery.data;

    if (action === '👍') {
      const originalMessage = callbackQuery.message.reply_to_message.text;
      await bot.sendMessage(TELEGRAM_CHANNEL_ID, originalMessage.split('\n\n')[1]);
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Announcement approved and sent!' });
    } else if (action === '👎') {
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Announcement rejected.' });
    }

    await bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);
  } catch (error) {
    console.error('Error handling callback query:', error);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));