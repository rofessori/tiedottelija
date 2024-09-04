# tiedottelija

tiedottelija on full-stack-sovellus (opiskelija)tapahtumien ja toiminnan viestien automatisointiin. Sovellus tiivistää ja kääntää pitkät tekstit käyttäen ChatGPT:tä ja lähettää ne Telegram-bottiin, joka hoitaa viestien moderoinnin ja välittämisen Telegram-kanavalle.

Sovelluksen ja sen koodin käyttämisestä määräävät `documents/`-kansion tietosuojaseloste sekä käyttöehdot. Sovelluksen käyttö kaupallisiin tarkoituksiin on ehdottomasti kielletty.

## Setuppaus

### Deps

- Node.js
- npm
- Docker

### Ohje rakentamiseen

Checkkaa ensin oikeudet ja `chmod +x`, sitten asenna riippuvuudet ja käynnistä palvelimet:

```bash
./setup.sh
./setup2.sh
./reboot.sh
