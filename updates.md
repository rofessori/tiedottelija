
### updates.md

#### Päivitykset

Tässä lista kaikista päivityksistä, joita on tehty tänään 5.9. 

Tarkoituksena parantaa bottin toimintaa, tuoda lisää koheesiota konfiguraatioihin ja parantaa toistaiseksi tosi sotkuista käyttäjäkokemusta.

1. **Tiedostorakenteen päivitys**: Lisättiin `data`-kansio projektin juureen, johon tallennetaan pysyvästi kanavat (`channels.json`) ja operaattorit (`operators.json`).
2. **Koodin päivitys tietojen pysyvyyteen**:
   - Muutettiin `/setmodchannel` ja `/setchannel` komennot tallentamaan kanava-ID:t tiedostoon.
   - Muutettiin `/operator` komento tallentamaan uudet operaattorit tiedostoon.
3. **Uudet funktiot tiedostojen lukemiseen ja tallentamiseen**: Lisättiin funktiot kanavien ja operaattoreiden tietojen lukemiseen ja tallentamiseen JSON-tiedostoista (`saveChannels` ja `saveOperators`).
4. **Ympäristömuuttujien ja salaisuuksien latauksen selkeyttäminen**: Varmistettiin, että kaikki lataukset ja tallennukset toimivat odotetulla tavalla ja käsittelevät tiedostoja turvallisesti.
5. **Turvallisuus ja luotettavuus**: Lisätty tarkistus, että `data`-hakemisto on olemassa, ja luodaan se tarvittaessa.
   
# Päivitykset

- Lisätty tietokannan tuki moderaattori- ja ilmoituskanavien tallentamiseksi.
- Korjattu bugi, jossa /announce ja /generate -viestit eivät lähetetty moderointikanavalle.
- Nyt käyttäjä saa ilmoituksen, kun viesti lähetetään moderaattorin tarkistettavaksi.
- Lisätty komento /listmoderators, joka näyttää botin moderaattoreiden käyttäjänimet.
- Lisätty uusi ominaisuus, joka pyytää lisää tietoa, jos käyttäjän antamat tiedot ovat riittämättömiä.
- Korjattu ongelma, jossa painikkeiden painaminen antoi vain "wait"-viestin, mutta ei suorittanut toimintoja.
- Nyt on mahdollista vaihtaa botin kieltä englannin ja suomen välillä.
- Botin oletuskieli on nyt suomi.
- /help-komento näyttää nyt vain käyttäjäkomennot. Operaattorikomennot näytetään erikseen /ophelp-komennolla.
- Parannettu /generate-komentoa lisäämällä esimerkkejä lyhentämisestä ja parantamisesta.
- Lisätty mahdollisuus moderaattoreille muokata tai korvata ilmoituksia omalla tekstillään.

#### Ominaisuudet

**Must:**
- [X] Botin painikkeet toimivat odotetusti.
- [X] Ilmoitusten generointikäsittely toimii GPT-3.5-Turbon kautta.
- [X] Moderaattorien listaus on toiminnassa.
- [] Viestien välitys ei toimi
- [] Generoitu tai välitetty valmis announce-viesti ei tarjoa vaihtoehtoja oikein/ollenkaan jatkotoimenpiteille.

**Nice to have:**
- [ ] Vastaus kaikkiin käyttäjän syötteisiin.
- [X] Tuki englanninkieliselle tilalle.
- [X] Moderaattorin kyky muokata ja hyväksyä/ hylätä ilmoitukset.

**Won't fix:**
- Vanha frontend voidaan jättää sellaiseksi kuin se on.
- Sotkuisuus. Sille ei voi mitään, mitäs oot sukua mulle BOTTI HAHAHA

Tämä tiedosto pitää yllä kirjaa kaikista tärkeistä päivityksistä ja auttaa ymmärtämään projektin kehityssuuntaa ja tilannetta.
