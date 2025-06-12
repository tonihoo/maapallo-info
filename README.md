# Maapallo.info

## Sovelluksen osat

Sovellus koostuu kolmesta komponentista: serveri/api-rajapinta (FastAPI/Python), tietokanta (PostgreSQL / PostGIS) sekä käyttöliittymä (React, MUI, OpenLayers).

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
# Asennetaan uusi riippuvuus client-kansiossa
cd client
npm i <uusi riippuvuus>

# Tai server-kansiossa (Python)
cd server
pip install <uusi riippuvuus>
echo "<uusi riippuvuus>" >> requirements.txt

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


## FastAPI backend

Technical Stack:
- FastAPI with async/await for high performance
- PostgreSQL + PostGIS for spatial data
- SQLAlchemy + asyncpg for async database operations
- Pydantic for data validation and type safety
- Docker for containerization

Working Endpoints:
- GET /api/v1/health/ ✅
- GET /api/v1/features/ ✅ (returns 11 features from database)
- POST /api/v1/features/ ✅ (successfully created test feature)
- PUT /api/v1/features/{id} ✅ (implemented)
- DELETE /api/v1/features/{id} ✅ (implemented)
The server is running on port 3003 and ready for production use!

The FastAPI server provides:
- Better Performance: Async request handling
- Type Safety: Full Python type hints and Pydantic validation
- Auto Documentation: Available at http://localhost:3003/docs
- Modern Architecture: Clean, maintainable codebase
- Spatial Support: Full PostGIS integration for geographic data
