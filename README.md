# tiedottelija

tiedottelija on full-stack-sovellus (opiskelija)tapahtumien ja toiminnan viestien automatisointiin. sovellus tiivistää ja kääntää pitkät tekstit käyttäen chatgpt:tä ja lähettää ne telegram-bottiin, joka hoitaa viestien moderoinnin ja välittämisen telegram-kanavalle.

sovelluksen ja sen koodin käyttämisestä määräävät documents/ -kansion tietosuojaseloste sekä käyttöehdot.

sovelluksen käyttö kaupallisiin tarkoituksiin on ehdottomasti kielletty.

## setuppaus
### deps

- node.js
- npm
- docker

### ohje rakentamiseen

checkkaa ensin oikeudet ja chmod +x, sitten asenna riippuvuudet ja käynnistä palvelimet:

```bash
./setup.sh
./setup2.sh
./reboot.sh
```

### lopuksi

luo juureen /secrets -kansio, johon viskaat avaimet .env nimeysjärjestyksen mukaan

apien ohjeet googlesta.

tuki: 
tg @kahvirulla