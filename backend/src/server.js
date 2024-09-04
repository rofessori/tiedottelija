const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const fs = require('fs');
const OpenAI = require('openai');
const path = require('path');
const adminCredentials = require('./adminCredentials');
const { authorize, addEventToCalendar } = require('./googleCalendar');

dotenv.config();

// Error handling for loading Google credentials
const credentialsPath = path.join(__dirname, '../secrets/google_credentials.json');
let googleCredentials;

try {
  googleCredentials = fs.readFileSync(credentialsPath, 'utf8');
} catch (err) {
  console.error('Failed to load Google credentials:', err);
  process.exit(1); // Exit the application if credentials are missing
}

// Google Calendar Authorization
authorize().then(() => {
  console.log('Google Calendar authorized');
}).catch(console.error);

const readSecret = (filepath) => {
  if (!filepath) {
    console.error('File path is not defined or environment variable is missing.');
    process.exit(1);
  }
  try {
    return fs.readFileSync(filepath, 'utf8').trim();
  } catch (err) {
    console.error(`Failed to read secret from ${filepath}:`, err);
    process.exit(1); // Exit if the secret cannot be read
  }
};

// OpenAI Initialization
const openai = new OpenAI({
  apiKey: readSecret(process.env.OPENAI_API_KEY_FILE),
});

// Telegram Bot Initialization
const bot = new TelegramBot(readSecret(process.env.TELEGRAM_BOT_TOKEN_FILE), { polling: true });
let TELEGRAM_CHANNEL_ID = readSecret(process.env.TELEGRAM_CHANNEL_ID_FILE);
let MODERATION_CHANNEL_ID = null; // New moderation channel ID

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
    bot.sendMessage(msg.chat.id, "Olet estetty käyttämästä tätä bottia.");
    return false;
  }
  if (!isWhitelisted(username)) {
    bot.sendMessage(msg.chat.id, "Sinulla ei ole oikeutta käyttää tätä bottia.");
    return false;
  }
  if (permission === 'operator' && !isOperator(username)) {
    bot.sendMessage(msg.chat.id, "Sinulla ei ole operaattorin oikeuksia käyttää tätä komentoa.");
    return false;
  }
  return true;
};

const checkBuffer = (msg) => {
  const now = Date.now();
  const bufferTime = bigBuffer || messageBuffer;
  if (now - lastMessageTime < bufferTime * 60 * 1000) {
    const remainingTime = Math.ceil((bufferTime * 60 * 1000 - (now - lastMessageTime)) / 60000);
    bot.sendMessage(msg.chat.id, `Odota ${remainingTime} minuuttia ennen kuin lähetät uuden ilmoituksen.`);
    return false;
  }
  return true;
};

// Default help menu in Finnish with buttons
bot.onText(/\/start/, (msg) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '/generate', callback_data: 'generate' }, { text: '/announce', callback_data: 'announce' }, { text: '/help', callback_data: 'help' }]
      ]
    }
  };
  bot.sendMessage(msg.chat.id, "Tervetuloa Ilmoitusbottiin! Kirjoita /help nähdäksesi käytettävissä olevat komennot.", options);
});

bot.onText(/\/help/, (msg) => {
  const helpText = `
Käytettävissä olevat komennot:
/start - Käynnistä botti
/help - Näytä tämä ohjeviesti
/announce - Lähetä valmis ilmoitus tarkastettavaksi
/generate <kuvaus> - Luo ilmoitus GPT-3:n avulla
/sourcecode - Näytä linkki botin lähdekoodiin
  `;
  bot.sendMessage(msg.chat.id, helpText);
});

bot.onText(/\/ophelp/, (msg) => {
  const opHelpText = `
Operaattorikomennot:
/setchannel <channel_id> - Aseta ilmoituskanava
/setmodchannel <channel_id> - Aseta moderointikanava
/operator <username> - Lisää käyttäjä operaattoriksi
/listoperators - Näytä lista kaikista operaattoreista
/togglewhitelist - Vaihda valkolistan käyttö päälle/pois
/whitelistadd - Lisää käyttäjiä valkolistalle
/whiteliststop - Lopeta käyttäjien lisääminen valkolistalle
/ban <username> - Estä käyttäjän käyttöoikeus
/banlist - Näytä estettyjen käyttäjien lista
/queue - Näytä moderointijono
/buffer <minuutit> - Aseta puskuriaika ilmoituksille (1-360 minuuttia)
/bigbuffer <minuutit> - Aseta pidempi puskuriaika ilmoituksille (1-360 minuuttia)
  `;
  bot.sendMessage(msg.chat.id, opHelpText);
});

// Generate and Announce commands differentiated
bot.onText(/\/generate(.*)/, async (msg, match) => {
  if (!checkPermission(msg, 'user') || !checkBuffer(msg)) return;
  const userInput = match[1] ? match[1].trim() : null;

  if (!userInput) {
    bot.sendMessage(msg.chat.id, "Anna tapahtuman kuvaus luodaksesi ilmoituksen:");
    bot.once('message', async (inputMsg) => {
      await processGenerateCommand(msg, inputMsg.text);
    });
  } else {
    await processGenerateCommand(msg, userInput);
  }
});

const processGenerateCommand = async (msg, userInput) => {
  try {
    const { announcement, eventDetails } = await generateAnnouncement(userInput);
    moderationQueue.push({
      id: msg.message_id,
      from: msg.from.username,
      text: announcement,
      eventDetails: eventDetails,
      status: 'pending',
      type: 'generate'
    });

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Lähetä', callback_data: 'approve_' + msg.message_id }, { text: 'Muokkaa', callback_data: 'edit_' + msg.message_id }]
        ]
      }
    };
    bot.sendMessage(msg.chat.id, `Luotu ilmoitus:\n\n${announcement}`, options);
    notifyModerationChannel(`Uusi luotu ilmoitus tarkistettavana:\n\n${announcement}`);
  } catch (error) {
    console.error('Virhe luodessa ilmoitusta:', error);
    bot.sendMessage(msg.chat.id, "Ilmoituksen luomisessa tapahtui virhe. Yritä myöhemmin uudelleen.");
  }
};

// Announce command for submitting ready-made announcements
bot.onText(/\/announce(.*)/, async (msg, match) => {
  if (!checkPermission(msg, 'user')) return;
  const userInput = match[1] ? match[1].trim() : null;

  if (!userInput) {
    bot.sendMessage(msg.chat.id, "Anna tapahtuman ilmoitus tarkastettavaksi:");
    bot.once('message', async (inputMsg) => {
      await processAnnounceCommand(msg, inputMsg.text);
    });
  } else {
    await processAnnounceCommand(msg, userInput);
  }
});

const processAnnounceCommand = async (msg, announcement) => {
  moderationQueue.push({
    id: msg.message_id,
    from: msg.from.username,
    text: announcement,
    status: 'pending',
    type: 'announce'
  });

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Lähetä', callback_data: 'approve_' + msg.message_id }, { text: 'Muokkaa', callback_data: 'edit_' + msg.message_id }]
      ]
    }
  };
  bot.sendMessage(msg.chat.id, "Ilmoituksesi on lähetetty tarkastettavaksi.", options);
  notifyModerationChannel(`Uusi ilmoitus tarkistettavana:\n\n${announcement}`);
};

// Notify moderation channel if set
const notifyModerationChannel = (message) => {
  if (MODERATION_CHANNEL_ID) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👍', callback_data: 'approve' }, { text: '👎', callback_data: 'reject' }],
          [{ text: 'Edit', callback_data: 'edit' }, { text: 'Regenerate', callback_data: 'regenerate' }, { text: 'Shorten', callback_data: 'shorten' }]
        ]
      }
    };
    bot.sendMessage(MODERATION_CHANNEL_ID, message, options);
  }
};

// Operator command to set moderation channel
bot.onText(/\/setmodchannel (.+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  MODERATION_CHANNEL_ID = match[1];
  bot.sendMessage(msg.chat.id, `Moderointikanava asetettu: ${MODERATION_CHANNEL_ID}`);
});

bot.onText(/\/setchannel (.+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  TELEGRAM_CHANNEL_ID = match[1];
  bot.sendMessage(msg.chat.id, `Kanava asetettu: ${TELEGRAM_CHANNEL_ID}`);
});

// New command to list all operators
bot.onText(/\/listoperators/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  const operatorsList = operators.join(', ');
  bot.sendMessage(msg.chat.id, `Operaattorit: ${operatorsList}`);
});

bot.onText(/\/togglewhitelist/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  isWhitelistEnabled = !isWhitelistEnabled;
  bot.sendMessage(msg.chat.id, `Valkolista on nyt ${isWhitelistEnabled ? 'käytössä' : 'pois käytöstä'}.`);
});

bot.onText(/\/whitelistadd/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  adminMode[msg.from.username] = 'whitelist';
  bot.sendMessage(msg.chat.id, "Lähetä käyttäjien käyttäjänimet lisätäksesi valkolistalle. Kirjoita /whiteliststop kun valmis.");
});

bot.onText(/\/whiteliststop/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  if (adminMode[msg.from.username] === 'whitelist') {
    delete adminMode[msg.from.username];
    bot.sendMessage(msg.chat.id, "Käyttäjien lisääminen valkolistalle lopetettu.");
  }
});

bot.onText(/\/ban (.+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const userToBan = match[1];
  if (!banlist.includes(userToBan)) {
    banlist.push(userToBan);
    bot.sendMessage(msg.chat.id, `${userToBan} on estetty käyttämästä bottia.`);
  } else {
    bot.sendMessage(msg.chat.id, `${userToBan} on jo estetty.`);
  }
});

bot.onText(/\/banlist/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  const banlistText = banlist.length > 0 ? banlist.join(', ') : "Ei estettyjä käyttäjiä.";
  bot.sendMessage(msg.chat.id, `Estetyt käyttäjät: ${banlistText}`);
});

bot.onText(/\/sourcecode/, (msg) => {
  bot.sendMessage(msg.chat.id, "Lähdekoodi löytyy täältä: https://github.com/rofessori/tiedottelija");
});

bot.onText(/\/queue/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  moderationQueue.forEach((item, index) => {
    bot.sendMessage(msg.chat.id, `${index + 1}. Lähettäjä: ${item.from}, Tila: ${item.status}, Tyyppi: ${item.type}\nViesti: ${item.text}`);
  });
});

bot.onText(/\/buffer (\d+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const minutes = parseInt(match[1]);
  if (minutes >= 1 && minutes <= 360) {
    messageBuffer = minutes;
    bigBuffer = 0;
    bot.sendMessage(msg.chat.id, `Puskuriaika asetettu ${minutes} minuutiksi.`);
  } else {
    bot.sendMessage(msg.chat.id, "Määritä puskuriaika välillä 1-360 minuuttia.");
  }
});

bot.onText(/\/bigbuffer (\d+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const minutes = parseInt(match[1]);
  if (minutes >= 1 && minutes <= 360) {
    bigBuffer = minutes;
    messageBuffer = 0;
    bot.sendMessage(msg.chat.id, `Pitkä puskuriaika asetettu ${minutes} minuutiksi.`);
  } else {
    bot.sendMessage(msg.chat.id, "Määritä pidempi puskuriaika välillä 1-360 minuuttia.");
  }
});

bot.onText(/\/sudosu/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;

  adminMode[username] = 'username';  // Set mode to 'username' for this user
  bot.sendMessage(chatId, "Syötä ylläpitäjän käyttäjänimi:");

  bot.once('message', (usernameMsg) => {
    if (usernameMsg.from.username === username && usernameMsg.text === adminCredentials.username) {
      adminMode[username] = 'password';  // Change mode to 'password' for this user
      bot.sendMessage(chatId, "Syötä ylläpitäjän salasana:");
      
      bot.once('message', (passwordMsg) => {
        if (passwordMsg.from.username === username && passwordMsg.text === adminCredentials.password) {
          if (!operators.includes(username)) {
            operators.push(username);
          }
          bot.sendMessage(chatId, "Ylläpitäjätila aktivoitu. Olet nyt operaattori.");
        } else {
          bot.sendMessage(chatId, "Virheellinen salasana. Ylläpitäjätila peruutettu.");
          delete adminMode[username];  // Reset mode
        }
      });
    } else {
      bot.sendMessage(chatId, "Virheellinen käyttäjänimi. Ylläpitäjätila peruutettu.");
      delete adminMode[username];  // Reset mode
    }
  });
});

bot.on('message', (msg) => {
  const username = msg.from.username;
  if (adminMode[username] === 'username') {
    if (msg.text === adminCredentials.username) {
      adminMode[username] = 'password';
      bot.sendMessage(msg.chat.id, "Syötä ylläpitäjän salasana:");
    } else {
      delete adminMode[username];
      bot.sendMessage(msg.chat.id, "Virheellinen käyttäjänimi. Ylläpitäjätila peruutettu.");
    }
  } else if (adminMode[username] === 'password') {
    if (msg.text === adminCredentials.password) {
      adminMode[username] = 'admin';
      bot.sendMessage(msg.chat.id, "Ylläpitäjätila aktivoitu. Voit nyt käyttää /operator-komentoa lisätäksesi itsesi operaattoriksi.");
    } else {
      delete adminMode[username];
      bot.sendMessage(msg.chat.id, "Virheellinen salasana. Ylläpitäjätila peruutettu.");
    }
  } else if (adminMode[username] === 'whitelist') {
    if (!whitelist.includes(msg.text)) {
      whitelist.push(msg.text);
      bot.sendMessage(msg.chat.id, `${msg.text} lisätty valkolistalle. Lähetä toinen käyttäjänimi tai kirjoita /whiteliststop lopettaaksesi.`);
    } else {
      bot.sendMessage(msg.chat.id, `${msg.text} on jo valkolistalla. Lähetä toinen käyttäjänimi tai kirjoita /whiteliststop lopettaaksesi.`);
    }
  } else if (msg.reply_to_message && (msg.text === '👍' || msg.text === '👎')) {
    if (!isOperator(username)) {
      bot.sendMessage(msg.chat.id, "Sinulla ei ole oikeuksia moderoida ilmoituksia.");
      return;
    }
    const originalMessageId = msg.reply_to_message.message_id;
    const queueItem = moderationQueue.find(item => item.id === originalMessageId);
    if (!queueItem) {
      bot.sendMessage(msg.chat.id, "Tämä viesti ei ole moderointijonossa.");
      return;
    }
    if (msg.text === '👍') {
      queueItem.status = 'approved';
      bot.sendMessage(TELEGRAM_CHANNEL_ID, queueItem.text);
      bot.sendMessage(msg.chat.id, "Ilmoitus hyväksytty ja lähetetty!");

      // Add event to Google Calendar
      if (queueItem.eventDetails) {
        const eventDetails = parseEventDetails(queueItem.eventDetails);
        addEventToCalendar(eventDetails);
      }
    } else {
      queueItem.status = 'rejected';
      bot.sendMessage(msg.chat.id, "Ilmoitus hylätty.");
      bot.sendMessage(queueItem.from, "Ilmoituksesi hylättiin. Voit lähettää uuden, jos haluat.");
    }
    lastMessageTime = 0; // Reset buffer after moderation
  }
});

const notifyOperators = (announcement, eventDetails) => {
  operators.forEach(operator => {
    bot.sendMessage(operator, `Uusi ilmoitus tarkistettavana:\n\n${announcement}\n\nTapahtuman tiedot:\n${eventDetails}\n\nReagoi 👍 hyväksyäksesi tai 👎 hylätäksesi.`);
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
