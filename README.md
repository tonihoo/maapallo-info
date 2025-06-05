# Maapallo.info

## Sovelluksen osat

Sovellus koostuu kolmesta komponentista: serveri/api-rajapinta (Node.js / Fastify), tietokanta (PostgreSQL / PostGIS) sekä käyttöliittymä (React, MUI, OpenLayers).

## Sovelluksen käynnistäminen

Buildaa sovellus dockerilla (komentoriviltä ajettaessa)

```
docker compose build
```

Käynnistä sovellus:

```
docker compose up -d
```

Näiden jälkeen tulisi olla kullekin sovelluksen komponentille (server, client, db) oma docker-kontti ajossa. Käyttöliittymän voi nyt avata osoitteesta [http://localhost:8080](http://localhost:8080).

Yksittäisen kontin saa käynnistettyä uudelleen komennolla. Esimerkiksi serverin tapauksessa:

```
docker compose restart server
```

Sovelluksen ollessa käynnissä, voidaan tietokantamigraatiot ajaa komennolla:

```
docker compose exec server npm run db-migrate
```

Ajettavat migraatiot löytyvät kansiosta `/server/db_migrations`. Mikäli teet muutoksia tietokantaan, tee se luomalla uusi migraatiotiedosto johon sisällytät SQL-koodit, jonka jälkeen voit ajaa ylläolevan migraatioajon uudelleen.

Konttien logeja voi seurailla ajamalla komennon:

```
docker compose logs -f <kontin nimi>
```

## Uuden riippuvuuden lisääminen

Jos haluat lisätä uuden riippuvuuden, se pitää viedä myös kontin sisälle buildaamalla kontit uudestaan:

```sh
# Asennetaan uusi riippuvuus client/server/shared-kansiossa
npm i <uusi riippuvuus>

# Buildataan kontit uudestaan (muuttumattomat kontit tulevat cachesta)
docker compose build

# Ajetaan sovellus uudestaan ylös, samalla luoden nimeämättömät (node_modules) voluumit uudestaan
docker compose up -d -V
```


## Testien ajaminen

```sh
# Backend-testit (Jest)
cd server
npm run test

# Frontend-testit (Cypress)
cd client
npx cypress open # -> E2E testing -> Start E2E testing in Chrome -> feature-form
```
