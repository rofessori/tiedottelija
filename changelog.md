### updates.md

#### Päivitykset

Tässä lista kaikista päivityksistä, joita on tehty viime aikoina.

Tarkoituksena parantaa bottin toimintaa, tuoda lisää koheesiota konfiguraatioihin ja parantaa käyttäjäkokemusta.

1. **Tiedostorakenteen päivitys**: Lisättiin `data`-kansio projektin juureen, johon tallennetaan pysyvästi kanavat (`channels.json`) ja operaattorit (`operators.json`).

2. **Koodin päivitys tietojen pysyvyyteen**:
   - Muutettiin `/setmodchannel` ja `/setchannel` komennot tallentamaan kanava-ID:t tiedostoon.
   - Muutettiin `/operator` komento tallentamaan uudet operaattorit tiedostoon.

3. **Uudet funktiot tiedostojen lukemiseen ja tallentamiseen**: Lisättiin funktiot kanavien ja operaattoreiden tietojen lukemiseen ja tallentamiseen JSON-tiedostoista (`saveChannels` ja `saveOperators`).

4. **Ympäristömuuttujien ja salaisuuksien latauksen selkeyttäminen**: Varmistettiin, että kaikki lataukset ja tallennukset toimivat odotetulla tavalla ja käsittelevät tiedostoja turvallisesti.

5. **Turvallisuus ja luotettavuus**: Lisätty tarkistus, että `data`-hakemisto on olemassa, ja luodaan se tarvittaessa.

6. **Tietokannan tuki**: Lisätty SQLite-tietokannan tuki generoidujen viestien tallentamiseksi asiakaskohtaisesti.

7. **Bugikorjauksia**:
   - Korjattu ongelma, jossa /announce ja /generate -viestit eivät lähteneet moderointikanavalle.
   - Korjattu ongelma, jossa painikkeiden painaminen antoi vain "wait"-viestin, mutta ei suorittanut toimintoja.

8. **Käyttäjäkokemus**:
   - Nyt käyttäjä saa ilmoituksen, kun viesti lähetetään moderaattorin tarkistettavaksi.
   - Lisätty uusi ominaisuus, joka pyytää lisää tietoa, jos käyttäjän antamat tiedot ovat riittämättömiä.
   - Parannettu /generate-komentoa lisäämällä esimerkkejä lyhentämisestä ja parantamisesta.

9. **Kielituki**:
   - Nyt on mahdollista vaihtaa botin kieltä englannin ja suomen välillä.
   - Botin oletuskieli on nyt suomi.

10. **Moderointitoiminnot**:
    - Lisätty komento /listmoderators, joka näyttää botin moderaattoreiden käyttäjänimet.
    - Lisätty mahdollisuus moderaattoreille muokata tai korvata ilmoituksia omalla tekstillään.

11. **Komentojen selkeytys**:
    - /help-komento näyttää nyt vain käyttäjäkomennot. 
    - Operaattorikomennot näytetään erikseen /ophelp-komennolla.

12. **Muistin hallinta**:
    - Lisätty /clearmemory-komento, jolla käyttäjä voi tyhjentää keskusteluhistoriansa botin kanssa.

#### Ominaisuudet

**Must:**
- [X] Botin painikkeet toimivat odotetusti.
- [X] Ilmoitusten generointikäsittely toimii GPT-3.5-Turbon kautta.
- [ ] Päivitetään GPT 4o
- [X] Moderaattorien listaus on toiminnassa.
- [X] Viestien välitys toimii nyt oikein moderointikanavalle ja ilmoituskanavalle.
- [X] Generoitu tai välitetty valmis announce-viesti tarjoaa nyt vaihtoehdot jatkotoimenpiteille.

**Nice to have:**
- [X] Vastaus kaikkiin käyttäjän syötteisiin on parantunut.
- [ ] Kielto vastata viesteihin jotka kanavilla.
- [ ] Vinkkaa jos komento on väärä
- [X] Tuki englanninkieliselle tilalle.
- [X] Moderaattorin kyky muokata ja hyväksyä/hylätä ilmoitukset.

**Won't fix:**
- Vanha frontend jätetään sellaiseksi kuin se on.
- Koodin kompleksisuus. Sille ei voi mitään, mitäs oot sukua mulle BOTTI HAHAHA

Tämä tiedosto pitää yllä kirjaa kaikista tärkeistä päivityksistä ja auttaa ymmärtämään projektin kehityssuuntaa ja tilannetta.
