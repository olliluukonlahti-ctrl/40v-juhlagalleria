# 40v. JuhlaGalleria

Julkaistu sivu: https://olliluukonlahti-ctrl.github.io/40v-juhlagalleria/

Sivut:
- Etusivu ja profiilin luonti: https://olliluukonlahti-ctrl.github.io/40v-juhlagalleria/
- Kuvien lataus puhelimesta: https://olliluukonlahti-ctrl.github.io/40v-juhlagalleria/lataa.html
- Juhlanäyttö ja QR-koodit: https://olliluukonlahti-ctrl.github.io/40v-juhlagalleria/naytto.html
- Järjestäjän kuvahallinta: https://olliluukonlahti-ctrl.github.io/40v-juhlagalleria/hallinta.html

Suomenkielinen, mobiiliystävällinen juhlagalleria 40-vuotisjuhliin. Saapuessaan vieras luo nimimerkin ja lisää profiilikuvan ilman salasanaa tai kirjautumista. Erillisessä TV-näkymässä pyörii nimimerkillä varustettu profiilikuvagalleria ja kaikkien juhlakuvien diaesitys. Vieraat skannaavat näytön QR-koodin ja lisäävät puhelimestaan yhden tai useamman kuvan yhteiseen diaesitykseen; QR-kuvat eivät linkity nimimerkkiin. Profiilit ja kuvat jaetaan laitteiden välillä Supabasen kautta.

Ulkoasu hakee tarkoituksella 2000-luvun alkupuolen IRC-gallerioista: kiinteä, keskitetty sivu, sininen välilehtipalkki, tiiviit laatikot ja vanhan ajan Arial/Tahoma-typografia. Puhelimessa palstat pinoutuvat, mutta sama retroilme säilyy.

## Käyttöönotto

Tarvitset Supabase-projektin. Sovellus on staattinen HTML/CSS/JS, joten sen voi tarjota mistä tahansa staattisesta web-hostauksesta. Älä julkaise sitä ennen kuin Supabasen asetukset ja tietokantakaava ovat kunnossa.

1. Luo Supabase-projekti ja avaa projektin **SQL Editor**.
2. Suorita [`supabase/schema.sql`](supabase/schema.sql) kokonaisuudessaan. Se luo profiili- ja kuvataulut, profiilin luonti- ja kuvien lisäysfunktiot sekä julkisen `party-photos`-kuvasäilön. Jos projektissa on jo aiempi galleria-asennus, suorita päivitetty tiedosto uudestaan: se tallentaa aiemmat profiilikuvat uuden juhlanäytön käyttöön ja siivoaa vanhat profiilien kuvaus- ja muokkausavaintiedot.
3. Kopioi `config.js`-tiedostoon Supabasen projektin **Project URL** ja **anon / publishable key** (ei `service_role`-avainta):

   ```js
   window.GALLERY_CONFIG = {
     supabaseUrl: "https://OMA-PROJEKTI.supabase.co",
     supabaseAnonKey: "OMA_ANON_TAI_PUBLISHABLE_AVAIN"
   };
   ```

4. Tarjoa hakemiston sisältö HTTPS-sivustona. Avaa juhlan tietokoneella `naytto.html` ja näytä se kokoruututilassa. Vieraat voivat skannata näytön QR-koodin, joka vie `lataa.html`-sivulle.
5. Testaa: luo `index.html`-sivulla nimimerkki ja profiilikuva. Avaa `naytto.html` ja lähetä puhelimella QR-koodin kautta yksi tai useampia juhlakuvia. Profiilikuvat näkyvät diaesityksessä nimimerkin kanssa; QR-kuvien kohdalla näytetään yleinen kuvateksti ilman nimimerkkiä. Kuvat vaihtuvat näytöllä 6 sekunnin välein, ja juhlanäyttö tarkistaa uudet kuvat automaattisesti 2 sekunnin välein ilman manuaalista päivittämistä.

Supabasen URL ja anon/publishable-avain ovat selaimessa näkyviä julkisia tunnisteita, eivät salaisuuksia. Profiilien ja kuvien katselu sekä uuden nimimerkin tai juhlakuvan lisääminen on anonyymisti sallittua; vieraat eivät kirjaudu sisään eikä QR-kuvia sidota profiiliin. Nimimerkin tulee olla yksilöllinen. Älä koskaan laita `service_role`-avainta selaimeen. TV-näkymän QR-koodi luodaan QRServer-palvelussa ja siihen välitetään julkinen `lataa.html`-sivun osoite.

Tuetut, selaimen avaamat puhelinkuvaformaatit tarkistetaan ennen latausta. Kuvat rajataan tarvittaessa enintään 1600 pikseliin ja pakataan JPEG-muotoon; Supabase-säilö valvoo JPEG-tyypin ja 5 Mt:n tallennusrajan. Kuvat näkyvät kaikille juhlanäytössä ja selaimen kuvagalleriassa. `config.js` kuuluu staattiseen julkiseen sivustoon, joten siihen saa laittaa vain anon/publishable-avaimen, ei `service_role`-avainta.

## Järjestäjän kuvien poisto

Järjestäjän hallintasivu on [hallinta.html](https://olliluukonlahti-ctrl.github.io/40v-juhlagalleria/hallinta.html). Poistot vaativat erillisen vähintään 16 merkin ylläpitäjän salasanan. Salasana tarkistetaan Supabase Edge Functionissa, eikä sitä tallenneta julkiseen sivukoodiin. Profiilin poisto poistaa nimimerkin ja sen profiilikuvan; nimettömiä juhlakuvia voi poistaa yksitellen.

Asenna Node.js/npm tarvittaessa, avaa komentorivi tämän repositorion juuressa ja kirjaudu sisään Supabase-tililläsi:

```powershell
npx supabase login
npx supabase link --project-ref ufsekycwnainqcnmqxrx
npx supabase secrets set ADMIN_PASSWORD="VAIHDA_TAHAN_VAHVAAN_OMAAN_SALASANAAN"
npx supabase functions deploy admin-delete --no-verify-jwt
```

Korvaa esimerkkiteksti omalla, vähintään 16 merkkiä pitkällä vahvalla salasanalla. Edge Function käyttää Supabasen palvelinpuolen `SUPABASE_SERVICE_ROLE_KEY`-ympäristömuuttujaa kuvien poistoon. Tätä avainta ei saa kopioida `config.js`-tiedostoon tai selaimeen. Jos järjestäjän salasana katoaa, vaihda se samalla `npx supabase secrets set ADMIN_PASSWORD="UUSI_VAHVA_SALASANA"`-komennolla.
