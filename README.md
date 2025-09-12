# Maapallo.info

Maapallo.info is a map based portal of global geospatial data related to human development, environment and other geographical phenomena.

## Technical Implementation

The application consists of four components:

- **Server**: FastAPI/Python backend (port 3003)
- **Client**: React/TypeScript/OpenLayers frontend (port 8080)
- **Database**: PostgreSQL + PostGIS database (port 5432)
- **PgAdmin**: Database administration interface (port 5050)

**Geoserver** will be added to the tech stack soon, see 'geoserver' branch.

### Geospatial layers

- Layers are served dynamically from PostGIS through the backend API.
- To add a new API-backed layer, import it via the admin API and it will appear through the API.

## Security & Environment Variables

This project uses environment variables for sensitive configuration:

- Copy `.env.example` to `.env` for local development
- Configure GitHub Secrets for production deployment
- Never commit `.env` files to version control

## Local Setup

### 1. Clone repository and navigate to folder

```bash
git clone <repository-url>
cd maapallo-info
```

### 2. Build and start application

```bash
# Build all Docker containers
docker compose build

# Start application in background
docker compose up -d

# Check that all containers are running
docker compose ps
```

### 3. Run database migrations

```bash
# Run migrations with Python script
docker compose exec server python run_migrations.py
```

### 4. Open application

- **Frontend**: [http://localhost:8080](http://localhost:8080)
- **API documentation**: [http://localhost:3003/docs](http://localhost:3003/docs)
- **PgAdmin**: [http://localhost:5050](http://localhost:5050)

## Daily Development

### Starting the application

```bash
# Start all containers
docker compose up -d

# Or start individual container
docker compose up -d server
docker compose up -d client
docker compose up -d db
```

### Stopping containers

```bash
# Stop all containers
docker compose down

# Stop individual container
docker compose stop server
```

### Following logs

```bash
# Follow all container logs
docker compose logs -f

# Follow logs of one container
docker compose logs -f server
docker compose logs -f client
```

## Dependency Management

### Adding frontend dependencies (React/TypeScript)

```bash
# Navigate to client folder
cd client

# Install new dependency
npm install <package-name>

# Rebuild client container
docker compose build client

# Restart client
docker compose up -d client
```

### Adding backend dependencies (Python)

```bash
# Navigate to server folder
cd server

# Add dependency to requirements.txt file
echo "<package-name>==<version>" >> requirements.txt

# OR install and save version automatically
pip install <package-name>
pip freeze | grep <package-name> >> requirements.txt

# Rebuild server container
docker compose build server

# Restart server
docker compose up -d server
```

### Removing dependencies

```bash
# Frontend
cd client
npm uninstall <package-name>
docker compose build client

# Backend
cd server
# Remove line from requirements.txt file manually
docker compose build server
```

## Container Rebuilding and Reset

### Rebuild containers

```bash
# Rebuild all containers (no cache)
docker compose build --no-cache

# Rebuild individual container
docker compose build --no-cache server
docker compose build --no-cache client
```

### Reset all containers and volumes

```bash
# Stop all containers and remove volumes
docker compose down -v

# Remove all containers, networks and build cache
docker compose down --rmi all --volumes --remove-orphans

# Build and start from scratch
docker compose build
docker compose up -d

# Run migrations again
docker compose exec server python run_migrations.py
```

### Fixing node_modules issues (client)

```bash
# Remove client container and volumes
docker compose stop client
docker compose rm client
docker volume rm $(docker volume ls -q | grep client)

# Build and start again
docker compose build client
docker compose up -d client
```

### Database reset

```bash
# Stop database and remove data
docker compose stop db
docker compose rm db
docker volume rm $(docker volume ls -q | grep db)

# Start database again
docker compose up -d db

# Wait for database to be ready and run migrations
sleep 10
docker compose exec server python run_migrations.py
```


## Testing

### Frontend tests (Cypress E2E)

To-Do

### Backend tests

To-Do

### API testing

```bash
# Test API endpoints with curl
curl http://localhost:3003/api/v1/health/
curl http://localhost:3003/api/v1/feature/

# Or open interactive API documentation
open http://localhost:3003/docs
```

## Database Migrations

Migrations are located in `/server/migrations/` folder and contain SQL scripts for database structure management.

### Running migrations

```bash
# Run all migrations
docker compose exec server python run_migrations.py

# Check migration status
docker compose exec server python -c "from migrate import check_migration_status; check_migration_status()"
```

### Creating a new migration

1. Create new SQL file: `/server/migrations/XXXX_description.sql`
2. Number the file next in sequence (e.g. `0003_add_new_table.sql`)
3. Write SQL commands to the file
4. Run migrations: `docker compose exec server python run_migrations.py`


## Technical Documentation

### FastAPI Backend

**Technical stack:**
- **FastAPI**: Modern, async Python web framework
- **SQLAlchemy**: Async ORM with PostgreSQL
- **Pydantic**: Data validation and type safety
- **PostGIS**: Spatial database extensions
- **Uvicorn**: ASGI server for production

**API Endpoints:**
- `GET /api/v1/health/` - Health check
- `GET /api/v1/feature/` - List all features
- `POST /api/v1/feature/` - Create new feature
- `GET /api/v1/feature/{id}` - Get feature by ID
- `PUT /api/v1/feature/{id}` - Update feature
- `DELETE /api/v1/feature/{id}` - Delete feature

**API Documentation:** [http://localhost:3003/docs](http://localhost:3003/docs)

### React Frontend

**Technical stack:**
- **React 18**: Modern React with hooks
- **TypeScript**: Type safety
- **Material-UI**: UI component library
- **OpenLayers**: 2D mapping with static geospatial data
- **Cesium**: 3D globe visualization
- **Vite**: Fast build tool

### PostgreSQL + PostGIS Database

**Configuration:**
- PostgreSQL 13 with PostGIS 3.3
- Spatial data support for geographic features
- SRID 3067 (Finland coordinate system) for locations

## Troubleshooting

### Common issues

**Container won't start:**
```bash
# Check containers
docker compose ps

# View error logs
docker compose logs <container-name>

# Restart container
docker compose restart <container-name>
```

**Port already in use error:**
```bash
# Check what's using the port
lsof -i :8080  # client
lsof -i :3003  # server
lsof -i :5432  # database

# Kill process or change port in docker-compose.yml
```

**Database connection error:**
```bash
# Check that database is running
docker compose ps db

# Test connection
docker compose exec db psql -U postgres -d maapallo_info -c "SELECT version();"
```

**Frontend doesn't show changes:**
```bash
# Clear browser cache or use incognito mode
# Or restart client container
docker compose restart client
```

## Azure Deployment

### Production URL ✅

- **Frontend**: https://maapallo.info/
- **API Health**: https://maapallo.info/api/v1/health/
- **API Features**: https://maapallo.info/api/v1/feature/

For detailed deployment instructions, see [AZURE_DEPLOYMENT_SETUP.md](./AZURE_DEPLOYMENT_SETUP.md).

### Viewing Azure Logs

```bash
# Stream live logs from Azure
az webapp log tail --name maapallo-info-app --resource-group maapallo-info-group

# Check container logs specifically
az webapp log tail --name maapallo-info-app --resource-group maapallo-info-group --provider application

# Check deployment logs
az webapp log deployment show --name maapallo-info-app --resource-group maapallo-info-group

# Check app status
az webapp show --name maapallo-info-app --resource-group maapallo-info-group --query state

# Restart the app
az webapp restart --name maapallo-info-app --resource-group maapallo-info-group
```
