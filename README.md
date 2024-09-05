# Tiedottelija

Tiedottelija on full-stack-sovellus (opiskelija)tapahtumien ja toiminnan viestien automatisointiin. Sovellus tiivistää ja kääntää pitkät tekstit käyttäen ChatGPT:tä ja lähettää ne Telegram-bottiin, joka hoitaa viestien moderoinnin ja välittämisen Telegram-kanavalle.

## Mitä tää tekee?

Botti ottaa pitkät ja sekavat tapahtumaviestit ja tekee niistä lyhyitä ja nättejä ilmoituksia. Se kääntää ne myös englanniksi. Viesitn välityksen hoitaa moderaattori ennen kun ne menevät julkiselle tiedotuskanavalle.

## Riippuvuudet

- Node.js
- npm
- Docker
- OpenAI API
- Telegram Bot API

## Komennot

### Peruskäyttäjät
- `/start` - Käynnistä botti
- `/help` - Näytä ohjeet
- `/announce` - Lähetä valmis ilmoitus tarkastettavaksi
- `/generate <kuvaus>` - Luo ilmoitus GPT-3:n avulla
- `/sourcecode` - Näytä linkki botin lähdekoodiin

### Operaattorit
- `/ophelp` - Näytä operaattorien ohjeet
- `/setchannel <channel_id>` - Aseta ilmoituskanava
- `/setmodchannel <channel_id>` - Aseta moderointikanava
- `/operator <username>` - Lisää käyttäjä operaattoriksi
- `/listoperators` - Näytä lista kaikista operaattoreista
- `/togglewhitelist` - Vaihda valkolistan käyttö päälle/pois
- `/whitelistadd` - Lisää käyttäjiä valkolistalle
- `/whiteliststop` - Lopeta käyttäjien lisääminen valkolistalle
- `/ban <username>` - Estä käyttäjän käyttöoikeus
- `/banlist` - Näytä estettyjen käyttäjien lista
- `/queue` - Näytä moderointijono
- `/buffer <minuutit>` - Aseta puskuriaika ilmoituksille (1-360 minuuttia)
- `/bigbuffer <minuutit>` - Aseta pidempi puskuriaika ilmoituksille (1-360 minuuttia)
- `/edit <message_id> <new_text>` - Muokkaa jonossa olevaa ilmoitusta
- `/shorten <message_id>` - Lyhennä jonossa olevaa ilmoitusta
- `/togglelanguage` - Vaihda suomen ja englannin kielen välillä
- `/listmoderators` - Listaa botin moderaattorien käyttäjänimet

## Miten tulla superadminiksi omassa botissa

1. Luo oma Telegram-botti @BotFather:in kautta
2. Aseta botin token ympäristömuuttujiin
3. Käynnistä botti
4. Lähetä botille komento `/sudosu`
5. Syötä ylläpitäjän käyttäjänimi (aseta tämä koodissa)
6. Syötä ylläpitäjän salasana (aseta tämä ympäristömuuttujissa)

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
```

### Botti telegramissa

Luo itse. OP:lla käytössä @tiedottelija_bot

### Lopuksi

Luo juureen /secrets -kansio, johon viskaat avaimet .env nimeysjärjestyksen mukaan.
Kopioi tämän sisältö myös /backend/secrets ja viskaa sinne myös tokenit/avaimet.

API:en ohjeet löydät Googlesta.

Tuki: tg @kahvirulla

Sovelluksen ja sen koodin käyttämisestä määräävät `documents/`-kansion tietosuojaseloste sekä käyttöehdot. Sovelluksen käyttö kaupallisiin tarkoituksiin on ehdottomasti kielletty.