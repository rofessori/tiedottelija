const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();
const readSecret = (filepath) => fs.readFileSync(filepath, 'utf8').trim();
const bot = new TelegramBot(readSecret(process.env.TELEGRAM_BOT_TOKEN_FILE), { polling: true });
const TELEGRAM_CHANNEL_ID = readSecret(process.env.TELEGRAM_CHANNEL_ID_FILE);
const moderationQueue = [];
bot.onText(/\/moderate/, (msg) => {
  const chatId = msg.chat.id;
  if (moderationQueue.length > 0) {
    const message = moderationQueue[0];
    bot.sendMessage(chatId, `Message to moderate:\n${message.text}\n\nApprove (/approve) or Reject (/reject)?`);
  } else {
    bot.sendMessage(chatId, 'No messages to moderate.');
  }
});

bot.onText(/\/approve/, (msg) => {
  if (moderationQueue.length > 0) {
    const approvedMessage = moderationQueue.shift();
    bot.sendMessage(TELEGRAM_CHANNEL_ID, approvedMessage.text);
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

bot.on('message', async (msg) => {
  if (msg.reply_to_message && (msg.text === '👍' || msg.text === '👎')) {
    const originalMessageId = msg.reply_to_message.message_id;
    const action = msg.text;

    if (action === '👍') {
      // Approve and forward the message
      const originalMessage = msg.reply_to_message.text;
      const announcementText = originalMessage.split('\n\n')[1];
      await bot.sendMessage(TELEGRAM_CHANNEL_ID, announcementText);
      await bot.sendMessage(msg.chat.id, 'Announcement approved and sent!', {
        reply_to_message_id: originalMessageId
      });
    } else if (action === '👎') {
      // Reject the message
      await bot.sendMessage(msg.chat.id, 'Announcement rejected.', {
        reply_to_message_id: originalMessageId
      });
    }
  }
});