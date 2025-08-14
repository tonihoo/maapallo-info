# GeoServer Data Directory

This directory contains uploaded geospatial data files for GeoServer.

## Supported Formats:
- **Shapefiles** (.shp + .shx + .dbf + .prj)
- **GeoJSON** (.geojson)
- **GeoPackage** (.gpkg)
- **KML** (.kml)

## Usage:

1. Place your data files in the `/data` subdirectory
2. Access GeoServer admin interface at http://localhost:8081/geoserver
3. Login with username and password
4. Use "Data" > "Stores" to add new data sources

## Example Files Structure:
```
geoserver/
├── data/
│   ├── boundaries/
│   │   ├── countries.shp
│   │   ├── countries.shx
│   │   ├── countries.dbf
│   │   └── countries.prj
│   ├── environmental/
│   │   └── ocean-currents.geojson
│   └── points-of-interest/
│       └── article-locations.gpkg
```

## PostGIS Integration:

GeoServer is automatically configured to connect to your PostGIS database.
