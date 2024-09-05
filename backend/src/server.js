const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const fs = require('fs');
const OpenAI = require('openai');

dotenv.config();

const readSecret = (filepath) => fs.readFileSync(filepath, 'utf8').trim();

const openai = new OpenAI({
  apiKey: readSecret(process.env.OPENAI_API_KEY_FILE),
});

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
let isEnglishMode = false; // New variable for language toggle

// Load moderators from a JSON file
let moderators = [];
try {
  moderators = JSON.parse(fs.readFileSync('moderators.json', 'utf8'));
} catch (error) {
  console.error('Error loading moderators:', error);
  moderators = []; // Initialize as empty array if file doesn't exist or is invalid
}

const generateAnnouncement = async (message, isRework = false) => {
  let prompt = `Olet viestintäasiantuntija, joka luo ytimekkäitä ja selkeitä ilmoituksia opiskelijatapahtumista. Kun saat tekstin, muotoile siitä tiivis ja informatiivinen ilmoitus sekä suomeksi että englanniksi alla olevan ohjeen mukaisesti.

### OHJEET

1. **Kirjoita otsikko suomeksi:**
   - Ensimmäinen otsikko on 50-60 merkkiä pitkä ja sisältää 3-6 sanaa. Tiivistä otsikkoon tapahtuman olennainen asia: mitä tapahtuu ja milloin. Kirjoita sulkeisiin otsikon jälkeen "(Lyhyt otsikko suomeksi)".

2. **Anna otsikko englanniksi:**
   - Toinen otsikko on tiiviimpi versio ensimmäisestä, noin 30-40 merkkiä pitkä ja sisältää 3-4 sanaa. Kirjoita sulkeisiin otsikon jälkeen "(Short headline in English)".

3. **Tee yhteenveto suomeksi:**
   - Lisää alkuun emoji 🇫🇮 Kirjoita suomenkielinen yhteenveto noin 40-60 sanalla (maksimissaan 400 merkkiä). Tee siitä lyhyt ja ytimekäs, jaa teksti kahteen kappaleeseen. Mainitse mitä tapahtuma on, missä ja milloin se tapahtuu, ja muita tärkeitä yksityiskohtia kuten osallistumistapa. Käytä selkeää ja yksinkertaista kieltä.

4. **Tee yhteenveto englanniksi:**
   - Lisää alkuun emoji 🇬🇧 Kirjoita englanninkielinen versio suomalaisesta yhteenvedosta samalla pituudella ja rakenteella. Varmista, että käännös on tarkka ja välittää saman keskeisen tiedon.

5. **Sisällytä tärkeitä yksityiskohtia:**
   - Jos ilmoituksessa on erityisiä ohjeita (esim. "OPM" eli "oma pullo mukaan") tai tarkkoja sijaintoja (kuten kiltahuone), mainitse ne selkeästi. Varmista, että konteksti säilyy oikein.

6. **Karsi yurhat uksityiskohdat pois:**
   - Jätä pois liian yksityiskohtaiset tarinat, esimerkit ja nimet, elleivät ne ole välttämättömiä tapahtuman ymmärtämiseksi. Keskity vain olennaiseen tietoon.

### Muotoile ilmoitus seuraavasti:

🇫🇮 [LYHYT OTSIKKO SUOMEKSI]
[Tapahtumatiedot suomeksi, lyhyesti ja informatiivisesti uutisen tapaan. Sisällytä tärkeimmät tiedot tapahtumasta, kuten mitä tapahtuu, missä, milloin ja mahdolliset ohjeet osallistujille. Lisää korkeintaan kaksi sopivaa emojia.]

---

🇬🇧 [LYHYT OTSIKKO ENGLANNIKSI]
[Samat tiedot kuin yllä, mutta englanniksi. Käytä selkeää ja tiivistä kieltä. Kun viittaat opiskelijajärjestö Hiukkaseen, käytä englanninkielistä monikkomuotoa "Hiukkanen's" tai omistusmuotoa "Hiukkanen's".]

### Esimerkkejä opiskelijatapahtumien viesteistä Telegram-tiedotuskanavalla:

Example 1:
🇫🇮 "Joko wiinihammasta kolottaa? 🍇🦷 HerkkuWiiniFestareilla kisataan tuttuun tapaan fuksi-, sima-, sekä viinisarjoissa! Tänä vuonna iltaa pääsee myös jatkamaan Teekkarisaunalle 19-> 🤯"  
🇬🇧 "Got a craving for some wine? 🍇🦷 As usual, HerkkuWiiniFestival will feature competitions in the categories of fresher's wine, mead, and regular wine. This year, you can also continue the evening at the Teekkarisauna from 7 pm -> 🤯"

Example 2:
🇫🇮 "UlkoXQ:lle on enää vain muutama paikka vapaana nopeimmille! 🏃🏼 Jos kuulet Uppsalan kutsun, suuntaa kipin kapin sähköpostiin ja varmista paikkasi reissuun. Ilmo päättyy tänään. 🇸🇪"  
🇬🇧 "There are only a few spots left to SwedenXQ! 🏃🏼 If you hear the calling of Uppsala, head to your emails and secure your spot to this trip. The registration ends today. 🇸🇪"

Käytä seuraavia tietoja luodaksesi ilmoituksen:
${message}

Varmista, että ilmoitus on ytimekäs, informatiivinen ja kiinnostava. Jos annetuissa tiedoissa ei ole tarpeeksi informaatiota (esim. puuttuu päivämäärä, aika tai paikka), pyydä lisätietoja.`;

  if (isRework) {
    prompt = `Muokkaa seuraavaa ilmoitusta opiskelijajärjestön tapahtumasta. Säilytä alkuperäisen viestin tärkeimmät tiedot ja rakenne. Tee siitä lyhyempi ja ytimekkäämpi:

${message}

Muista, että tämä on ILMOITUS opiskelijatapahtumasta. Älä lisää mitään keksittyä tietoa. Jos alkuperäisessä viestissä ei ole tarpeeksi tai se vaikuttaa enemmänkin pitkältä ajatusten virralta kuin tapahtuman tiedoilta, ilmoita siitä erikseen jotta käyttäjä voi antaa lisätietoja. Tapahtumailmoituksessa on aina oltava ainakin paikka, aika, päivämäärä ja mikä tapahtuman nimi on. jos ilmoitetaan killan kokouksesta, siinä tulisi myös mainita tila, jossa se pidetään.`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content.trim();
    if (response.includes("Lisätietoja tarvitaan") || response.includes("More information needed")) {
      return { text: response, needsMoreInfo: true };
    }
    return { text: response, needsMoreInfo: false };
  } catch (error) {
    if (error.code === 'insufficient_quota') {
      return { text: `Virhe: OpenAI API:n kiintiö ylitetty. Yritä myöhemmin uudelleen tai ota yhteyttä ylläpitäjään.\n\nAlkuperäinen viesti:\n${message}`, needsMoreInfo: false };
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
    bot.sendMessage(msg.chat.id, isEnglishMode ? "You are banned from using this bot." : "Olet estetty käyttämästä tätä bottia.");
    return false;
  }
  if (!isWhitelisted(username)) {
    bot.sendMessage(msg.chat.id, isEnglishMode ? "You don't have permission to use this bot." : "Sinulla ei ole oikeutta käyttää tätä bottia.");
    return false;
  }
  if (permission === 'operator' && !isOperator(username)) {
    bot.sendMessage(msg.chat.id, isEnglishMode ? "You don't have operator rights to use this command." : "Sinulla ei ole operaattorin oikeuksia käyttää tätä komentoa.");
    return false;
  }
  return true;
};

const checkBuffer = (msg) => {
  const now = Date.now();
  const bufferTime = bigBuffer || messageBuffer;
  if (now - lastMessageTime < bufferTime * 60 * 1000) {
    const remainingTime = Math.ceil((bufferTime * 60 * 1000 - (now - lastMessageTime)) / 60000);
    bot.sendMessage(msg.chat.id, isEnglishMode ? `Wait ${remainingTime} minutes before sending a new announcement.` : `Odota ${remainingTime} minuuttia ennen kuin lähetät uuden ilmoituksen.`);
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
  bot.sendMessage(msg.chat.id, isEnglishMode ? "Welcome to the Announcement Bot! Type /help to see available commands." : "Tervetuloa Ilmoitusbottiin! Kirjoita /help nähdäksesi käytettävissä olevat komennot.", options);
});

bot.onText(/\/help/, (msg) => {
  const helpText = isEnglishMode ? `
Available commands:
/start - Start the bot
/help - Show this help message
/announce - Submit a ready-made announcement for review
/generate <description> - Create an announcement using GPT-3
/sourcecode - Show link to bot's source code
  ` : `
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
  if (!checkPermission(msg, 'operator')) return;
  const opHelpText = isEnglishMode ? `
Operator commands:
/setchannel <channel_id> - Set announcement channel
/setmodchannel <channel_id> - Set moderation channel
/operator <username> - Add user as operator
/listoperators - Show list of all operators
/togglewhitelist - Toggle whitelist on/off
/whitelistadd - Add users to whitelist
/whiteliststop - Stop adding users to whitelist
/ban <username> - Ban user
/banlist - Show list of banned users
/queue - Show moderation queue
/buffer <minutes> - Set buffer time for announcements (1-360 minutes)
/bigbuffer <minutes> - Set longer buffer time for announcements (1-360 minutes)
/edit <message_id> <new_text> - Edit message in queue
/shorten <message_id> - Shorten message in queue
/togglelanguage - Toggle between Finnish and English
/listmoderators - List usernames of bot moderators
  ` : `
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
/edit <message_id> <new_text> - Muokkaa jonossa olevaa ilmoitusta
/shorten <message_id> - Lyhennä jonossa olevaa ilmoitusta
/togglelanguage - Vaihda suomen ja englannin kielen välillä
/listmoderators - Listaa botin moderaattorien käyttäjänimet
  `;
  bot.sendMessage(msg.chat.id, opHelpText);
});

// Generate command
bot.onText(/\/generate(.*)/, async (msg, match) => {
  if (!checkPermission(msg, 'user') || !checkBuffer(msg)) return;
  const userInput = match[1] ? match[1].trim() : null;

  if (!userInput) {
    bot.sendMessage(msg.chat.id, isEnglishMode ? "Provide an event description to create an announcement:" : "Anna tapahtuman kuvaus luodaksesi ilmoituksen:");
    bot.once('message', async (inputMsg) => {
      await processGenerateCommand(msg, inputMsg.text);
    });
  } else {
    await processGenerateCommand(msg, userInput);
  }
});

const processGenerateCommand = async (msg, userInput) => {
  try {
    const { text: announcement, needsMoreInfo } = await generateAnnouncement(userInput);
    if (needsMoreInfo) {
      bot.sendMessage(msg.chat.id, isEnglishMode ? "More information needed. Please provide:" : "Lisätietoja tarvitaan. Ole hyvä ja kerro:");
      bot.sendMessage(msg.chat.id, announcement);
      return;
    }
    moderationQueue.push({
      id: msg.message_id,
      from: msg.from.username,
      text: announcement,
      originalInput: userInput,
      status: 'pending',
      type: 'generate'
    });

    bot.sendMessage(msg.chat.id, `${isEnglishMode ? 'Created announcement:' : 'Luotu ilmoitus:'}\n\n${announcement}`);
    bot.sendMessage(msg.chat.id, isEnglishMode ? `Your announcement will be checked and forwarded by the moderators: ${moderators.join(', ')}` : `Ilmoituksesi tarkistetaan ja välitetään moderaattoreiden toimesta: ${moderators.join(', ')}`);
    notifyModerationChannel(`${isEnglishMode ? 'New generated announcement for review:' : 'Uusi luotu ilmoitus tarkistettavana:'}\n\n${announcement}`);
  } catch (error) {
    console.error('Error creating announcement:', error);
    bot.sendMessage(msg.chat.id, isEnglishMode ? "An error occurred while creating the announcement. Please try again later." : "Ilmoituksen luomisessa tapahtui virhe. Yritä myöhemmin uudelleen.");
  }
};

// Announce command for submitting ready-made announcements
bot.onText(/\/announce(.*)/, async (msg, match) => {
  if (!checkPermission(msg, 'user')) return;
  const userInput = match[1] ? match[1].trim() : null;

  if (!userInput) {
    bot.sendMessage(msg.chat.id, isEnglishMode ? "Provide the event announcement for review:" : "Anna tapahtuman ilmoitus tarkastettavaksi:");
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

  bot.sendMessage(msg.chat.id, isEnglishMode ? "Your announcement has been sent for review." : "Ilmoituksesi on lähetetty tarkastettavaksi.");
  bot.sendMessage(msg.chat.id, isEnglishMode ? `Your announcement will be checked and forwarded by the moderators: ${moderators.join(', ')}` : `Ilmoituksesi tarkistetaan ja välitetään moderaattoreiden toimesta: ${moderators.join(', ')}`);
  notifyModerationChannel(`${isEnglishMode ? 'New announcement for review:' : 'Uusi ilmoitus tarkistettavana:'}\n\n${announcement}`);
};

// Notify moderation channel if set
const notifyModerationChannel = (message) => {
  if (MODERATION_CHANNEL_ID) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👍', callback_data: 'approve' }, { text: '👎', callback_data: 'reject' }],
          [{ text: isEnglishMode ? 'Edit' : 'Muokkaa', callback_data: 'edit' }, 
           { text: isEnglishMode ? 'Regenerate' : 'Uudelleenluo', callback_data: 'regenerate' }, 
           { text: isEnglishMode ? 'Shorten' : 'Lyhennä', callback_data: 'shorten' }]
        ]
      }
    };
    bot.sendMessage(MODERATION_CHANNEL_ID, message, options).catch(error => {
      console.error('Error sending message to moderation channel:', error);
      bot.sendMessage(msg.chat.id, isEnglishMode ? 
        "Error: Unable to send message to moderation channel. Please check the channel ID and bot permissions." : 
        "Virhe: Viestiä ei voitu lähettää moderointikanavalle. Tarkista kanavan ID ja botin oikeudet.");
    });
  } else {
    console.error('Moderation channel ID not set');
    bot.sendMessage(msg.chat.id, isEnglishMode ?
      "Error: Moderation channel not set. Please contact an operator to set up the moderation channel." :
      "Virhe: Moderointikanavaa ei ole asetettu. Ota yhteyttä operaattoriin moderointikanavan asettamiseksi.");
  }
};

// Operator command to set moderation channel
bot.onText(/\/setmodchannel (.+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  MODERATION_CHANNEL_ID = match[1];
  bot.sendMessage(msg.chat.id, isEnglishMode ? `Moderation channel set to: ${MODERATION_CHANNEL_ID}` : `Moderointikanava asetettu: ${MODERATION_CHANNEL_ID}`);
});

bot.onText(/\/setchannel (.+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  TELEGRAM_CHANNEL_ID = match[1];
  bot.sendMessage(msg.chat.id, isEnglishMode ? `Channel set to: ${TELEGRAM_CHANNEL_ID}` : `Kanava asetettu: ${TELEGRAM_CHANNEL_ID}`);
});

bot.onText(/\/listoperators/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  const operatorsList = operators.join(', ');
  bot.sendMessage(msg.chat.id, isEnglishMode ? `Operators: ${operatorsList}` : `Operaattorit: ${operatorsList}`);
});

bot.onText(/\/togglewhitelist/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  isWhitelistEnabled = !isWhitelistEnabled;
  bot.sendMessage(msg.chat.id, isEnglishMode ? `Whitelist is now ${isWhitelistEnabled ? 'enabled' : 'disabled'}.` : `Valkolista on nyt ${isWhitelistEnabled ? 'käytössä' : 'pois käytöstä'}.`);
});

bot.onText(/\/whitelistadd/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  adminMode[msg.from.username] = 'whitelist';
  bot.sendMessage(msg.chat.id, isEnglishMode ? "Send usernames to add to the whitelist. Type /whiteliststop when finished." : "Lähetä käyttäjien käyttäjänimet lisätäksesi valkolistalle. Kirjoita /whiteliststop kun valmis.");
});

bot.onText(/\/whiteliststop/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  if (adminMode[msg.from.username] === 'whitelist') {
    delete adminMode[msg.from.username];
    bot.sendMessage(msg.chat.id, isEnglishMode ? "Finished adding users to the whitelist." : "Käyttäjien lisääminen valkolistalle lopetettu.");
  }
});

bot.onText(/\/ban (.+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const userToBan = match[1];
  if (!banlist.includes(userToBan)) {
    banlist.push(userToBan);
    bot.sendMessage(msg.chat.id, isEnglishMode ? `${userToBan} has been banned from using the bot.` : `${userToBan} on estetty käyttämästä bottia.`);
  } else {
    bot.sendMessage(msg.chat.id, isEnglishMode ? `${userToBan} is already banned.` : `${userToBan} on jo estetty.`);
  }
});

bot.onText(/\/banlist/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  const banlistText = banlist.length > 0 ? banlist.join(', ') : isEnglishMode ? "No banned users." : "Ei estettyjä käyttäjiä.";
  bot.sendMessage(msg.chat.id, isEnglishMode ? `Banned users: ${banlistText}` : `Estetyt käyttäjät: ${banlistText}`);
});

bot.onText(/\/sourcecode/, (msg) => {
  bot.sendMessage(msg.chat.id, isEnglishMode ? "The source code can be found here: https://github.com/rofessori/tiedottelija" : "Lähdekoodi löytyy täältä: https://github.com/rofessori/tiedottelija");
});

bot.onText(/\/queue/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  moderationQueue.forEach((item, index) => {
    bot.sendMessage(msg.chat.id, isEnglishMode ? 
      `${index + 1}. Sender: ${item.from}, Status: ${item.status}, Type: ${item.type}\nMessage: ${item.text}` :
      `${index + 1}. Lähettäjä: ${item.from}, Tila: ${item.status}, Tyyppi: ${item.type}\nViesti: ${item.text}`
    );
  });
});

bot.onText(/\/buffer (\d+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const minutes = parseInt(match[1]);
  if (minutes >= 1 && minutes <= 360) {
    messageBuffer = minutes;
    bigBuffer = 0;
    bot.sendMessage(msg.chat.id, isEnglishMode ? `Buffer time set to ${minutes} minutes.` : `Puskuriaika asetettu ${minutes} minuutiksi.`);
  } else {
    bot.sendMessage(msg.chat.id, isEnglishMode ? "Set buffer time between 1-360 minutes." : "Määritä puskuriaika välillä 1-360 minuuttia.");
  }
});

bot.onText(/\/bigbuffer (\d+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const minutes = parseInt(match[1]);
  if (minutes >= 1 && minutes <= 360) {
    bigBuffer = minutes;
    messageBuffer = 0;
    bot.sendMessage(msg.chat.id, isEnglishMode ? `Long buffer time set to ${minutes} minutes.` : `Pitkä puskuriaika asetettu ${minutes} minuutiksi.`);
  } else {
    bot.sendMessage(msg.chat.id, isEnglishMode ? "Set longer buffer time between 1-360 minutes." : "Määritä pidempi puskuriaika välillä 1-360 minuuttia.");
  }
});

bot.onText(/\/edit (\d+) (.+)/, (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const messageId = parseInt(match[1]);
  const newText = match[2];
  const queueItem = moderationQueue.find(item => item.id === messageId);
  if (queueItem) {
    queueItem.text = newText;
    bot.sendMessage(msg.chat.id, isEnglishMode ? "Announcement updated in queue." : "Ilmoitus päivitetty jonossa.");
    notifyModerationChannel(isEnglishMode ? `Announcement updated:\n\n${newText}` : `Ilmoitus päivitetty:\n\n${newText}`);
  } else {
    bot.sendMessage(msg.chat.id, isEnglishMode ? "Announcement not found in queue." : "Ilmoitusta ei löydy jonosta.");
  }
});

bot.onText(/\/shorten (\d+)/, async (msg, match) => {
  if (!checkPermission(msg, 'operator')) return;
  const messageId = parseInt(match[1]);
  const queueItem = moderationQueue.find(item => item.id === messageId);
  if (queueItem) {
    const { text: shortenedText } = await generateAnnouncement(queueItem.text, true);
    queueItem.text = shortenedText;
    bot.sendMessage(msg.chat.id, isEnglishMode ? `Shortened announcement:\n\n${shortenedText}` : `Lyhennetty ilmoitus:\n\n${shortenedText}`);
    notifyModerationChannel(isEnglishMode ? `Announcement shortened:\n\n${shortenedText}` : `Ilmoitus lyhennetty:\n\n${shortenedText}`);
  } else {
    bot.sendMessage(msg.chat.id, isEnglishMode ? "Announcement not found in queue." : "Ilmoitusta ei löydy jonosta.");
  }
});

// List moderators
bot.onText(/\/listmoderators/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  const moderatorsList = moderators.join(', ');
  bot.sendMessage(msg.chat.id, isEnglishMode ? `Bot moderators: ${moderatorsList}` : `Botin moderaattorit: ${moderatorsList}`);
});

// Command to toggle language
bot.onText(/\/togglelanguage/, (msg) => {
  if (!checkPermission(msg, 'operator')) return;
  isEnglishMode = !isEnglishMode;
  bot.sendMessage(msg.chat.id, isEnglishMode ? "Bot is now speaking in English." : "Botti puhuu nyt suomea.");
});

// Handle inline button callbacks
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;

  if (action.startsWith('approve_')) {
    const messageId = parseInt(action.split('_')[1]);
    const queueItem = moderationQueue.find(item => item.id === messageId);
    if (queueItem) {
      queueItem.status = 'approved';
      bot.sendMessage(TELEGRAM_CHANNEL_ID, queueItem.text);
      bot.answerCallbackQuery(callbackQuery.id, { text: isEnglishMode ? "Announcement approved and sent!" : "Ilmoitus hyväksytty ja lähetetty!" });
    }
  } else if (action.startsWith('edit_')) {
    const messageId = parseInt(action.split('_')[1]);
    bot.answerCallbackQuery(callbackQuery.id);
    bot.sendMessage(chatId, isEnglishMode ? "Write new text for the announcement:" : "Kirjoita uusi teksti ilmoitukselle:");
    bot.once('message', async (editMsg) => {
      const queueItem = moderationQueue.find(item => item.id === messageId);
      if (queueItem) {
        queueItem.text = editMsg.text;
        bot.sendMessage(chatId, isEnglishMode ? "Announcement updated." : "Ilmoitus päivitetty.");
        notifyModerationChannel(isEnglishMode ? `Updated announcement:\n\n${queueItem.text}` : `Päivitetty ilmoitus:\n\n${queueItem.text}`);
      }
    });
  } else if (action === 'approve' || action === 'reject' || action === 'edit' || action === 'regenerate' || action === 'shorten') {
    // Handle moderation actions
    const queueItem = moderationQueue.find(item => item.text === msg.text.split('\n\n')[1]);
    if (queueItem) {
      switch (action) {
        case 'approve':
          queueItem.status = 'approved';
          bot.sendMessage(TELEGRAM_CHANNEL_ID, queueItem.text);
          bot.answerCallbackQuery(callbackQuery.id, { text: isEnglishMode ? "Announcement approved and sent!" : "Ilmoitus hyväksytty ja lähetetty!" });
          break;
        case 'reject':
          queueItem.status = 'rejected';
          bot.answerCallbackQuery(callbackQuery.id, { text: isEnglishMode ? "Announcement rejected." : "Ilmoitus hylätty." });
          break;
        case 'edit':
          bot.answerCallbackQuery(callbackQuery.id);
          bot.sendMessage(chatId, isEnglishMode ? "Write new text for the announcement:" : "Kirjoita uusi teksti ilmoitukselle:");
          bot.once('message', async (editMsg) => {
            queueItem.text = editMsg.text;
            bot.sendMessage(chatId, isEnglishMode ? "Announcement updated." : "Ilmoitus päivitetty.");
            notifyModerationChannel(isEnglishMode ? `Updated announcement:\n\n${queueItem.text}` : `Päivitetty ilmoitus:\n\n${queueItem.text}`);
          });
          break;
        case 'regenerate':
          bot.answerCallbackQuery(callbackQuery.id);
          const { text: regeneratedText } = await generateAnnouncement(queueItem.originalInput || queueItem.text);
          queueItem.text = regeneratedText;
          bot.sendMessage(chatId, isEnglishMode ? `Regenerated announcement:\n\n${regeneratedText}` : `Uudelleenluotu ilmoitus:\n\n${regeneratedText}`);
          notifyModerationChannel(isEnglishMode ? `Regenerated announcement:\n\n${regeneratedText}` : `Uudelleenluotu ilmoitus:\n\n${regeneratedText}`);
          break;
        case 'shorten':
          bot.answerCallbackQuery(callbackQuery.id);
          const { text: shortenedText } = await generateAnnouncement(queueItem.text, true);
          queueItem.text = shortenedText;
          bot.sendMessage(chatId, isEnglishMode ? `Shortened announcement:\n\n${shortenedText}` : `Lyhennetty ilmoitus:\n\n${shortenedText}`);
          notifyModerationChannel(isEnglishMode ? `Shortened announcement:\n\n${shortenedText}` : `Lyhennetty ilmoitus:\n\n${shortenedText}`);
          break;
      }
    }
  }
});

// New command for admin authentication
bot.onText(/\/sudosu/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;

  adminMode[username] = 'username';
  bot.sendMessage(chatId, isEnglishMode ? "Enter admin username:" : "Syötä ylläpitäjän käyttäjänimi:");

  bot.once('message', (usernameMsg) => {
    if (usernameMsg.from.username === username && usernameMsg.text === SUPER_ADMIN) {
      adminMode[username] = 'password';
      bot.sendMessage(chatId, isEnglishMode ? "Enter admin password:" : "Syötä ylläpitäjän salasana:");
      
      bot.once('message', (passwordMsg) => {
        if (passwordMsg.from.username === username && passwordMsg.text === process.env.ADMIN_PASSWORD) {
          if (!operators.includes(username)) {
            operators.push(username);
            fs.writeFileSync('operators.json', JSON.stringify(operators));
          }
          bot.sendMessage(chatId, isEnglishMode ? "Admin mode activated. You are now an operator." : "Ylläpitäjätila aktivoitu. Olet nyt operaattori.");
        } else {
          bot.sendMessage(chatId, isEnglishMode ? "Invalid password. Admin mode cancelled." : "Virheellinen salasana. Ylläpitäjätila peruutettu.");
        }
        delete adminMode[username];
      });
    } else {
      bot.sendMessage(chatId, isEnglishMode ? "Invalid username. Admin mode cancelled." : "Virheellinen käyttäjänimi. Ylläpitäjätila peruutettu.");
      delete adminMode[username];
    }
  });
});

// Error handling for moderation channel messages
bot.on('error', (error) => {
  console.error('Error in bot:', error);
  if (error.code === 'ETELEGRAM' && error.response && error.response.statusCode === 403) {
    console.error('Bot is not a member of the moderation channel or lacks necessary permissions.');
  }
});

// Start the bot
console.log('Bot is running...');