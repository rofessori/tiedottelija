const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const fs = require('fs');
const OpenAI = require('openai');
const adminCredentials = require('./adminCredentials');
const { authorize, addEventToCalendar } = require('./googleCalendar');

dotenv.config();
authorize();

const readSecret = (filepath) => fs.readFileSync(filepath, 'utf8').trim();

const openai = new OpenAI({
  apiKey: readSecret(process.env.OPENAI_API_KEY_FILE),
});


const bot = new TelegramBot(readSecret(process.env.TELEGRAM_BOT_TOKEN_FILE), { polling: true });
let TELEGRAM_CHANNEL_ID = readSecret(process.env.TELEGRAM_CHANNEL_ID_FILE);


const SUPER_ADMIN = '@kahvirulla';
let operators = [SUPER_ADMIN];
let whitelist = [];
let banlist = [];
let isWhitelistEnabled = false;
let messageBuffer = 0;
let bigBuffer = 0;
let lastMessageTime = 0;
let moderationQueue = [];
let adminMode = {};


const generateAnnouncement = async (message) => {
  const prompt = `Create an announcement for a student organization event in the following format:

🇫🇮 [EVENT SHORT HEADLINE IN FINNISH]
[event info in finnish, short and informative, like a piece of news. Include up to two relevant emojis.]

---

🇬🇧 [SHORT HEADLINE IN ENGLISH]
[Same information as above but in English. When referring to the student organization Hiukkanen, use "Hiukkanens" as the English plural form.]

---

EVENT DETAILS:
Title: [Event title]
Date: [Event date in YYYY-MM-DD format]
Time: [Event time in HH:MM format]
Description: [A brief description of the event]

Use the following information to create the announcement and extract the event details:
${message}

Ensure the announcement is concise, informative, and engaging.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content.trim();
    const [announcement, eventDetails] = response.split('EVENT DETAILS:');
    
    return { announcement: announcement.trim(), eventDetails: eventDetails.trim() };
  } catch (error) {
    if (error.code === 'insufficient_quota') {
      return { 
        announcement: `Error: OpenAI API quota exceeded. Please try again later or contact the administrator.\n\nOriginal message:\n${message}`,
        eventDetails: null
      };
    }
    throw error;
  }
};

const isOperator = (username) => operators.includes(username) || username === SUPER_ADMIN;

const isWhitelisted = (username) => !isWhitelistEnabled || whitelist.includes(username) || isOperator(username);

const isBanned = (username) => banlist.includes(username);

const checkPermission = (msg, permission) => {
  const username = msg.from.username;
  if (isBanned(username)) {
    bot.sendMessage(msg.chat.id, "You are banned from using this bot.");
    return false;
  }
  if (!isWhitelisted(username)) {
    bot.sendMessage(msg.chat.id, "You are not whitelisted to use this bot.");
    return false;
  }
  if (permission === 'operator' && !isOperator(username)) {
    bot.sendMessage(msg.chat.id, "You don't have operator rights to use this command.");
    return false;
  }
  return true;
};

const checkBuffer = (msg) => {
  const now = Date.now();
  const bufferTime = bigBuffer || messageBuffer;
  if (now - lastMessageTime < bufferTime * 60 * 1000) {
    const remainingTime = Math.ceil((bufferTime * 60 * 1000 - (now - lastMessageTime)) / 60000);
    bot.sendMessage(msg.chat.id, `Please wait ${remainingTime} minutes before sending another announcement.`);
    return false;
  }
  return true;
};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to the Announcement Bot! Type /help for available commands.");
});

bot.onText(/\/help/, (msg) => {
  const helpText = `
Available commands:
/start - Start the bot
/help - Show this help message
/announce <message> - Submit an announcement for moderation
/sourcecode - Get the link to the bot's source code

Operator commands (use /ophelp for more info):
/setchannel, /operator, /togglewhitelist, /whitelistadd, /whiteliststop, /ban, /banlist, /queue, /buffer, /bigbuffer
  `;
  bot.sendMessage(msg.chat.id, helpText);
});

bot.onText(/\/ophelp/, (msg) => {
  const opHelpText = `
Operator commands:
/setchannel <channel_id> - Set the channel for announcements
/operator <username> - Add a user as an operator
/togglewhitelist - Toggle the whitelist on/off
/whitelistadd - Start adding users to the whitelist
/whiteliststop - Stop adding users to the whitelist
/ban <username> - Ban a user from using the bot
/banlist - Show the list of banned users
/queue - Show the moderation queue
/buffer <minutes> - Set a buffer time for announcements (1-360 minutes)
/bigbuffer <minutes> - Set a big buffer time for announcements (1-360 minutes)
  `;
  bot.sendMessage(msg.chat.id, opHelpText);
});

bot.onText(/\/announce (.+)/, async (msg, match) => {
  if (!checkPermission(msg, 'user') || !checkBuffer(msg)) return;
  const userInput = match[1];
  try {
    const { announcement, eventDetails } = await generateAnnouncement(userInput);
    moderationQueue.push({ 
      id: msg.message_id, 
      from: msg.from.username, 
      text: announcement, 
      eventDetails: eventDetails,
      status: 'pending' 
    });
    bot.sendMessage(msg.chat.id, "Your announcement has been generated and submitted for moderation.");
    notifyOperators(announcement, eventDetails);
    lastMessageTime = Date.now();
  } catch (error) {
    console.error('Error generating announcement:', error);
    bot.sendMessage(msg.chat.id, "An error occurred while generating the announcement. Please try again later.");
  }
});

bot.onText(/\/setchannel (.+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  TELEGRAM_CHANNEL_ID = match[1];
  bot.sendMessage(msg.chat.id, `Channel set to ${TELEGRAM_CHANNEL_ID}`);
});

bot.onText(/\/operator (.+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const newOperator = match[1];
  if (!operators.includes(newOperator)) {
    operators.push(newOperator);
    bot.sendMessage(msg.chat.id, `${newOperator} has been added as an operator.`);
  } else {
    bot.sendMessage(msg.chat.id, `${newOperator} is already an operator.`);
  }
});

bot.onText(/\/togglewhitelist/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  isWhitelistEnabled = !isWhitelistEnabled;
  bot.sendMessage(msg.chat.id, `Whitelist is now ${isWhitelistEnabled ? 'enabled' : 'disabled'}.`);
});

bot.onText(/\/whitelistadd/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  adminMode[msg.from.username] = 'whitelist';
  bot.sendMessage(msg.chat.id, "Send usernames to add to the whitelist. Type /whiteliststop when done.");
});

bot.onText(/\/whiteliststop/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  if (adminMode[msg.from.username] === 'whitelist') {
    delete adminMode[msg.from.username];
    bot.sendMessage(msg.chat.id, "Stopped adding users to the whitelist.");
  }
});

bot.onText(/\/ban (.+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const userToBan = match[1];
  if (!banlist.includes(userToBan)) {
    banlist.push(userToBan);
    bot.sendMessage(msg.chat.id, `${userToBan} has been banned from using the bot.`);
  } else {
    bot.sendMessage(msg.chat.id, `${userToBan} is already banned.`);
  }
});

bot.onText(/\/banlist/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  const banlistText = banlist.length > 0 ? banlist.join(', ') : "No users are currently banned.";
  bot.sendMessage(msg.chat.id, `Banned users: ${banlistText}`);
});

bot.onText(/\/sudosu/, (msg) => {
  adminMode[msg.from.username] = 'username';
  bot.sendMessage(msg.chat.id, "Enter admin username:");
});

bot.onText(/\/sourcecode/, (msg) => {
  bot.sendMessage(msg.chat.id, "You can find the source code at: https://github.com/rofessori/tiedottelija");
});

bot.onText(/\/queue/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  const queueText = moderationQueue.map((item, index) => 
    `${index + 1}. From: ${item.from}, Status: ${item.status}\nMessage: ${item.text}`
  ).join('\n\n');
  bot.sendMessage(msg.chat.id, queueText || "The moderation queue is empty.");
});

bot.onText(/\/buffer (\d+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const minutes = parseInt(match[1]);
  if (minutes >= 1 && minutes <= 360) {
    messageBuffer = minutes;
    bigBuffer = 0;
    bot.sendMessage(msg.chat.id, `Buffer set to ${minutes} minutes.`);
  } else {
    bot.sendMessage(msg.chat.id, "Please specify a buffer time between 1 and 360 minutes.");
  }
});

bot.onText(/\/bigbuffer (\d+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const minutes = parseInt(match[1]);
  if (minutes >= 1 && minutes <= 360) {
    bigBuffer = minutes;
    messageBuffer = 0;
    bot.sendMessage(msg.chat.id, `Big buffer set to ${minutes} minutes.`);
  } else {
    bot.sendMessage(msg.chat.id, "Please specify a big buffer time between 1 and 360 minutes.");
  }
});

bot.on('message', (msg) => {
  const username = msg.from.username;
  if (adminMode[username] === 'username') {
    if (msg.text === adminCredentials.username) {
      adminMode[username] = 'password';
      bot.sendMessage(msg.chat.id, "Enter admin password:");
    } else {
      delete adminMode[username];
      bot.sendMessage(msg.chat.id, "Invalid username. Admin mode cancelled.");
    }
  } else if (adminMode[username] === 'password') {
    if (msg.text === adminCredentials.password) {
      adminMode[username] = 'admin';
      bot.sendMessage(msg.chat.id, "Admin mode activated. You can now use /operator to give yourself operator rights.");
    } else {
      delete adminMode[username];
      bot.sendMessage(msg.chat.id, "Invalid password. Admin mode cancelled.");
    }
  } else if (adminMode[username] === 'whitelist') {
    if (!whitelist.includes(msg.text)) {
      whitelist.push(msg.text);
      bot.sendMessage(msg.chat.id, `${msg.text} added to the whitelist. Send another username or /whiteliststop to finish.`);
    } else {
      bot.sendMessage(msg.chat.id, `${msg.text} is already in the whitelist. Send another username or /whiteliststop to finish.`);
    }
  } else if (msg.reply_to_message && (msg.text === '👍' || msg.text === '👎')) {
    if (!isOperator(username)) {
      bot.sendMessage(msg.chat.id, "You don't have permission to moderate announcements.");
      return;
    }
    const originalMessageId = msg.reply_to_message.message_id;
    const queueItem = moderationQueue.find(item => item.id === originalMessageId);
    if (!queueItem) {
      bot.sendMessage(msg.chat.id, "This message is not in the moderation queue.");
      return;
    }
    if (msg.text === '👍') {
      queueItem.status = 'approved';
      bot.sendMessage(TELEGRAM_CHANNEL_ID, queueItem.text);
      bot.sendMessage(msg.chat.id, "Announcement approved and sent!");
      
      // Add event to Google Calendar
      if (queueItem.eventDetails) {
        const eventDetails = parseEventDetails(queueItem.eventDetails);
        addEventToCalendar(eventDetails);
      }
    } else {
      queueItem.status = 'rejected';
      bot.sendMessage(msg.chat.id, "Announcement rejected.");
      bot.sendMessage(queueItem.from, "Your announcement was rejected. You can submit a new one if you'd like.");
    }
    lastMessageTime = 0; // Reset buffer after moderation
  }
});

const notifyOperators = (announcement, eventDetails) => {
  operators.forEach(operator => {
    bot.sendMessage(operator, `New announcement to moderate:\n\n${announcement}\n\nEvent Details:\n${eventDetails}\n\nReact with 👍 to approve or 👎 to reject.`);
  });
};

function parseEventDetails(eventDetailsString) {
  const lines = eventDetailsString.split('\n');
  const eventDetails = {};
  
  lines.forEach(line => {
    const [key, value] = line.split(':');
    if (key && value) {
      eventDetails[key.trim().toLowerCase()] = value.trim();
    }
  });

  return {
    summary: eventDetails.title,
    description: eventDetails.description,
    start: {
      dateTime: `${eventDetails.date}T${eventDetails.time}:00`,
      timeZone: 'Europe/Helsinki',
    },
    end: {
      dateTime: `${eventDetails.date}T${eventDetails.time}:00`,
      timeZone: 'Europe/Helsinki',
    },
  };
}

console.log('Bot is running...');