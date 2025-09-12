# GeoServer Uploads Directory

This directory is for uploading geographic data files that will be automatically imported into PostGIS and made available as GeoServer layers.

## Supported Formats

- **GeoJSON** (`.geojson`) - Direct import
- **GeoPackage** (`.gpkg`) - SQLite-based OGC standard
- **Shapefiles** (`.zip`) - Zip archive containing .shp, .shx, .dbf, etc.

## Usage

1. Place your data files in this directory
2. Run the import script:
   ```bash
   docker-compose exec geoserver /usr/local/bin/import-data.sh
   ```

Or import a specific file:
```bash
docker-compose exec geoserver /usr/local/bin/import-data.sh /opt/geoserver/uploads/mydata.geojson
```

## What Happens During Import

1. Data is imported into PostGIS database
2. GeoServer layer is automatically created
3. Layer is published in the "maapallo" workspace
4. Files are moved to `processed/` subdirectory

## Accessing Your Data

After import, your layers will be available at:
- WMS: `http://localhost:8081/geoserver/maapallo/wms`
- WFS: `http://localhost:8081/geoserver/maapallo/wfs`

## Example URLs

- Layer preview: `http://localhost:8081/geoserver/maapallo/wms/reflect?layers=your_layer_name`
- GetCapabilities: `http://localhost:8081/geoserver/maapallo/wms?request=GetCapabilities`
