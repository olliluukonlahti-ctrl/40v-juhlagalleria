# 40v. JuhlaGalleria

Julkaistu sivu: https://lekafit.online/

Sivut:
- Etusivu ja profiilit: https://lekafit.online/
- Juhla-chat: https://lekafit.online/chat.html
- Juhlanäyttö ja QR-koodit: https://lekafit.online/naytto.html
- Järjestäjän hallinta: https://lekafit.online/hallinta.html
- Ovikamera: https://lekafit.online/door-camera.html

Suomenkielinen, mobiiliystävällinen juhlagalleria 40-vuotisjuhliin. Vieras luo nimimerkin ja lisää profiilikuvan ilman salasanaa tai kirjautumista. Vaihtoehtoisesti järjestäjä ottaa kuvan ovikamerasivulla ja julkaisee uuden profiilin vieraan nimimerkillä. Erillisessä TV-näkymässä pyörii profiilikuvagalleria. Profiilit ja kuvat jaetaan laitteiden välillä Supabasen kautta.

Erillisellä `chat.html`-sivulla on vanhan ajan KISS.FM-chatin tyylinen Juhla-chat. Viestit näkyvät vieraille ilman kirjautumista. Nimimerkki ei ole varmennettu. Viestit ovat pelkkää tekstiä, enintään 200 merkkiä, saman nimimerkin lähetysraja on 20 sekuntia ja vain viimeisen 72 tunnin viestit näytetään. Uuden viestin yhteydessä tietokannasta siivotaan yli 72 tuntia vanhat viestit; tauluun jätetään enintään 500 uusinta viestiä.

Ovikamera on erillinen kokeilusivu järjestäjälle: kirjoita uusi nimimerkki, käynnistä kamera, ota kuva ja julkaise se erillisellä painikkeella. Kamera vaatii selaimen käyttöluvan ja HTTPS-yhteyden. Sivua ei ole lisätty vieraiden navigaatioon, mutta se ei ole salasanalla suojattu; jaa sen osoite vain järjestäjille. Julkaistu kuva ja nimimerkki tulevat julkiseen galleriaan.

Ulkoasu hakee tarkoituksella 2000-luvun alkupuolen IRC-gallerioista: kiinteä, keskitetty sivu, sininen välilehtipalkki, tiiviit laatikot ja vanhan ajan Arial/Tahoma-typografia. Puhelimessa palstat pinoutuvat, mutta sama retroilme säilyy.

## Käyttöönotto

Tarvitset Supabase-projektin. Sovellus on staattinen HTML/CSS/JS, joten sen voi tarjota mistä tahansa staattisesta web-hostauksesta. Älä julkaise sitä ennen kuin Supabasen asetukset ja tietokantakaava ovat kunnossa.

1. Luo Supabase-projekti ja avaa projektin **SQL Editor**.
2. Suorita [`supabase/schema.sql`](supabase/schema.sql) kokonaisuudessaan. Se luo profiili- ja kuvataulut, profiilin luontifunktion sekä julkisen `party-photos`-kuvasäilön. Jos projektiin on jo asennettu aiempi galleria, suorita päivitetty tiedosto uudestaan: se siivoaa vanhat profiilien kuvaus- ja muokkausavaintiedot ja poistaa käytöstä nimettömien juhlakuvien lisäysfunktion.
3. Jos otat Juhla-chatin käyttöön, suorita lisäksi [`supabase/guestbook.sql`](supabase/guestbook.sql) Supabasen SQL Editorissa. Muutos luo viestitaulun ja anonyymin viestinlähetysproseduurin. Järjestäjän viestien poistoon päivitä myös `admin-delete` Edge Function komennolla `npx supabase functions deploy admin-delete --no-verify-jwt` (ohjeet alla).
4. Kopioi `config.js`-tiedostoon Supabasen projektin **Project URL** ja **anon / publishable key** (ei `service_role`-avainta):

   ```js
   window.GALLERY_CONFIG = {
     supabaseUrl: "https://OMA-PROJEKTI.supabase.co",
     supabaseAnonKey: "OMA_ANON_TAI_PUBLISHABLE_AVAIN"
   };
   ```

5. Tarjoa hakemiston sisältö HTTPS-sivustona. Avaa juhlan tietokoneella `naytto.html` ja näytä se kokoruututilassa. Näytön QR-koodi vie profiilin luontiin.
6. Testaa: luo `index.html`-sivulla nimimerkki ja profiilikuva tai julkaise kuva `door-camera.html`-ovikameralla. Profiilikuvat näkyvät diaesityksessä nimimerkin kanssa. Kuvat vaihtuvat näytöllä 6 sekunnin välein, ja juhlanäyttö tarkistaa uudet profiilikuvat automaattisesti 2 sekunnin välein ilman manuaalista päivittämistä. Testaa chatissa viestin lähetys ja poisto ylläpidon kuvahallinnasta.

Supabasen URL ja anon/publishable-avain ovat selaimessa näkyviä julkisia tunnisteita, eivät salaisuuksia. Profiilien ja kuvien katselu sekä uuden profiilin luominen on anonyymisti sallittua; vieraat eivät kirjaudu sisään. Nimimerkin tulee olla yksilöllinen. Älä koskaan laita `service_role`-avainta selaimeen. TV-näkymän QR-koodi luodaan QRServer-palvelussa ja siihen välitetään profiilin luonnin osoite.

Tuetut, selaimen avaamat puhelinkuvaformaatit tarkistetaan ennen latausta. Kuvat rajataan tarvittaessa enintään 1600 pikseliin ja pakataan JPEG-muotoon; Supabase-säilö valvoo JPEG-tyypin ja 5 Mt:n tallennusrajan. Kuvat näkyvät kaikille juhlanäytössä ja selaimen kuvagalleriassa. `config.js` kuuluu staattiseen julkiseen sivustoon, joten siihen saa laittaa vain anon/publishable-avaimen, ei `service_role`-avainta.

## Järjestäjän kuvien poisto

Järjestäjän hallintasivu on [hallinta.html](https://lekafit.online/hallinta.html). Poistot vaativat erillisen vähintään 16 merkin ylläpitäjän salasanan. Salasana tarkistetaan Supabase Edge Functionissa, eikä sitä tallenneta julkiseen sivukoodiin. Profiilin poisto poistaa nimimerkin ja sen profiilikuvan; nimettömiä juhlakuvia voi poistaa yksitellen.

Asenna Node.js/npm tarvittaessa, avaa komentorivi tämän repositorion juuressa ja kirjaudu sisään Supabase-tililläsi:

```powershell
npx supabase login
npx supabase link --project-ref ufsekycwnainqcnmqxrx
npx supabase secrets set ADMIN_PASSWORD="VAIHDA_TAHAN_VAHVAAN_OMAAN_SALASANAAN"
npx supabase functions deploy admin-delete --no-verify-jwt
```

Korvaa esimerkkiteksti omalla, vähintään 16 merkkiä pitkällä vahvalla salasanalla. Edge Function käyttää Supabasen palvelinpuolen `SUPABASE_SERVICE_ROLE_KEY`-ympäristömuuttujaa kuvien poistoon. Tätä avainta ei saa kopioida `config.js`-tiedostoon tai selaimeen. Jos järjestäjän salasana katoaa, vaihda se samalla `npx supabase secrets set ADMIN_PASSWORD="UUSI_VAHVA_SALASANA"`-komennolla.
