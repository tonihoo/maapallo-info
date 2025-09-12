# 🌍 Maapallo GIS with GeoServer - Local Development Setup

This guide will help you set up the complete Maapallo GIS application with GeoServer integration for local development.

## 🚀 Quick Start

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Wait for services to initialize (2-3 minutes):**
   ```bash
   ./test-setup.sh
   ```

3. **Access the applications:**
   - **Frontend**: http://localhost:8080
   - **GeoServer**: http://localhost:8081/geoserver (admin/geoserver)
   - **FastAPI**: http://localhost:3003
   - **PgAdmin**: http://localhost:5050 (admin@example.com/admin)

## 📁 Data Import Workflow

### Option 1: Automatic Import
1. Place your data files in `./geoserver/uploads/`:
   - GeoJSON files (`.geojson`)
   - GeoPackage files (`.gpkg`)
   - Shapefile archives (`.zip`)

2. Run the import script:
   ```bash
   docker-compose exec geoserver /usr/local/bin/import-data.sh
   ```

### Option 2: Manual Import via GeoServer UI
1. Open GeoServer admin: http://localhost:8081/geoserver
2. Log in with: admin/geoserver
3. Navigate to: Data → Stores → Add new Store
4. Choose your data type and configure connection

### Option 3: Import Specific File
```bash
# Import with auto-generated table name
docker-compose exec geoserver /usr/local/bin/import-data.sh /opt/geoserver/uploads/mydata.geojson

# Import with custom table name
docker-compose exec geoserver /usr/local/bin/import-data.sh /opt/geoserver/uploads/mydata.geojson my_custom_layer
```

## 🗄️ Database Access

### Via PgAdmin (Web Interface)
1. Open http://localhost:5050
2. Login: admin@example.com / admin
3. Add server with these settings:
   - Host: db
   - Port: 5432
   - Database: db_dev
   - Username: db_dev_user
   - Password: DevPassword

### Via Command Line
```bash
# Connect to database
docker-compose exec db psql -U db_dev_user -d db_dev

# List all tables
\dt

# View spatial tables
SELECT * FROM geometry_columns;
```

## 🌐 Using Your Layers

After importing data, your layers are available via:

### WMS (Web Map Service)
```
http://localhost:8081/geoserver/maapallo/wms?
  service=WMS&
  version=1.1.0&
  request=GetMap&
  layers=your_layer_name&
  bbox=-180,-90,180,90&
  width=512&
  height=256&
  srs=EPSG:4326&
  format=image/png
```

### WFS (Web Feature Service)
```
http://localhost:8081/geoserver/maapallo/wfs?
  service=WFS&
  version=1.0.0&
  request=GetFeature&
  typeName=your_layer_name&
  outputFormat=application/json
```

### Vector Tiles (MVT)
```
http://localhost:8081/geoserver/maapallo/wms?
  service=WMS&
  version=1.1.0&
  request=GetMap&
  layers=your_layer_name&
  bbox={bbox}&
  width=256&
  height=256&
  srs=EPSG:3857&
  format=application/x-protobuf;type=mapbox-vector
```

## 🔧 Frontend Integration

To use GeoServer layers in your React frontend, update your layer hooks:

```typescript
// Example for useAdultLiteracyLayer.ts
const geoserverUrl = 'http://localhost:8081/geoserver/maapallo/wms';

const source = new TileWMS({
  url: geoserverUrl,
  params: {
    'LAYERS': 'adult_literacy',
    'TILED': true,
  },
  serverType: 'geoserver',
});
```

## 🛠️ Development Commands

```bash
# View logs
docker-compose logs -f geoserver
docker-compose logs -f server

# Restart a service
docker-compose restart geoserver

# Rebuild after changes
docker-compose build geoserver
docker-compose up -d geoserver

# Clean restart
docker-compose down
docker-compose up -d

# Import all files in uploads directory
docker-compose exec geoserver /usr/local/bin/import-data.sh

# Access GeoServer container
docker-compose exec geoserver bash
```

## 📊 Monitoring & Debugging

### Check Service Status
```bash
./test-setup.sh
```

### View Database Tables
```bash
docker-compose exec db psql -U db_dev_user -d db_dev -c "\dt"
```

### GeoServer Data Directory
The GeoServer data directory is persisted in a Docker volume. To inspect:
```bash
docker-compose exec geoserver ls -la /opt/geoserver/data_dir/
```

### Reset Everything
```bash
# Warning: This will delete all data!
docker-compose down -v
docker-compose up -d
```

## 🎯 Next Steps

1. **Import your existing data** using the upload methods above
2. **Update frontend layers** to use GeoServer WMS/WFS endpoints
3. **Configure styling** in GeoServer for better visualization
4. **Set up tile caching** for better performance
5. **Test AI integration** with spatial data queries

## 🆘 Troubleshooting

### GeoServer won't start
- Check logs: `docker-compose logs geoserver`
- Ensure database is running: `docker-compose ps db`
- Try rebuilding: `docker-compose build geoserver`

### Import script fails
- Check file format and permissions
- Verify database connection
- Check logs: `docker-compose exec geoserver tail -f /opt/geoserver/logs/geoserver.log`

### Frontend can't access GeoServer
- Verify CORS settings in docker-compose.yml
- Check that GeoServer is running on port 8081
- Test direct access: http://localhost:8081/geoserver

Need help? Check the logs and feel free to ask!
