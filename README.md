# tiedottelija

tiedottelija on full-stack-sovellus (opiskelija)tapahtumien ja toiminnan viestien automatisointiin. sovellus tiivistää ja kääntää pitkät tekstit käyttäen chatgpt:tä ja lähettää ne telegram-bottiin, joka hoitaa viestien moderoinnin ja välittämisen telegram-kanavalle.

## setuppaus
### deps

- node.js
- npm
- docker

### ohje rakentamiseen

asenna riippuvuudet ja käynnistä palvelimet:

```bash
cd frontend
npm install
npm start
cd backend
npm install
npm run dev
```

luo juureen /secrets -kansio, johon viskaat avaimet .env nimeysjärjestyksen mukaan

apien ohjeet googlesta.

tuki: tg @kuumavesivaraaja