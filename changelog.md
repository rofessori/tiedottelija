### changelog.md

**Must:**
- [X] Botin painikkeet toimivat odotetusti.
- [X] Ilmoitusten generointikäsittely toimii GPT-3.5-Turbon kautta.
- [ ] Päivitetään GPT 4:ään
- [X] Moderaattorien listaus on toiminnassa.
- [X] Viestien välitys toimii nyt oikein moderointikanavalle ja ilmoituskanavalle.
- [X] Generoitu tai välitetty valmis announce-viesti tarjoaa nyt vaihtoehdot jatkotoimenpiteille.
- [X] Korjaa viestin generoinnin hallusionaatio-ongelmat aiempien saman keskustelu-id:n kanssa (maininnat ovat bugged)
- [ ] Paranna käyttäjän vuorovaikutusta viestin generoinnin jälkeen, teksti on helevetin sotkuista nääs
- [ ] Optimoi botin vastausaika ja painikkeiden toiminta
- [ ] Korjaa /generate-komento toimimaan oikein tyhjällä syötteellä (variaatio)
- [ ] Lisää "viestiä generoidaan" -ilmoitus
- [X] Paranna keskustelunäkymän organisointia
- [ ] Korjaa moderointikanava toimivaksi
- [ ] Paranna /queue-komennon näkymää ja toiminnallisuutta
- [ ] Implementoi uusi ID-järjestelmä viesteille (00001-99999)
- [ ] Luo serverside kirjasto lähetetyille ja uudelleengeneroiduille viesteille
- [ ] Päivitä kalenteritoiminnallisuus
- [ ] Lisää uusi virheenkäsittelyjärjestelmä

**Nice to have:**
- [X] Vastaus kaikkiin käyttäjän syötteisiin on parantunut.
- [ ] Kielto vastata viesteihin jotka kanavilla.
- [ ] Vinkkaa jos komento on väärä
- [X] Tuki englanninkieliselle tilalle.
- [X] Moderaattorin kyky muokata ja hyväksyä/hylätä ilmoitukset.
- [X] Maininta järkevästä tietosuojaselosteen ylläpitämisestä.
- [ ] Mahdollisuus ladata viestikirjasto superadmin-tilassa
- [ ] Lisää muotoiluja ja emojeja moderointinäkymään
- [ ] Varoitus moderaattoreille, kun ID-laskuri lähestyy maksimia

**Won't fix:**
- Vanha frontend jätetään sellaiseksi kuin se on.
- Koodin kompleksisuus. Sille ei voi mitään, mitäs oot sukua mulle BOTTI HAHAHA