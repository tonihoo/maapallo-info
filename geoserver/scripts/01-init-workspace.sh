#!/bin/bash
# GeoServer initialization script for Maapallo workspace and layers

set -e

echo "🌍 Initializing Maapallo GeoServer configuration..."

# Wait for GeoServer to be ready
echo "Waiting for GeoServer to start..."
until curl -s http://localhost:8080/geoserver/web/ > /dev/null 2>&1; do
    echo "GeoServer not ready yet, waiting..."
    sleep 5
done

echo "✅ GeoServer is ready, starting configuration..."

# GeoServer REST API base URL
GEOSERVER_URL="http://localhost:8080/geoserver/rest"
AUTH="admin:geoserver"

# Function to make REST API calls
geoserver_curl() {
    curl -u "$AUTH" -H "Content-Type: application/json" "$@"
}

# Create Maapallo workspace
echo "Creating Maapallo workspace..."
geoserver_curl -X POST "$GEOSERVER_URL/workspaces" -d '{
    "workspace": {
        "name": "maapallo",
        "isolated": false
    }
}' || echo "Workspace may already exist"

# Create PostGIS datastore
echo "Creating PostGIS datastore..."
geoserver_curl -X POST "$GEOSERVER_URL/workspaces/maapallo/datastores" -d '{
    "dataStore": {
        "name": "postgis_maapallo",
        "connectionParameters": {
            "host": "'$POSTGRES_HOST'",
            "port": "'$POSTGRES_PORT'",
            "database": "'$POSTGRES_DB'",
            "user": "'$POSTGRES_USER'",
            "passwd": "'$POSTGRES_PASS'",
            "dbtype": "postgis",
            "schema": "public",
            "Expose primary keys": "true",
            "validate connections": "true",
            "Connection timeout": "20",
            "preparedStatements": "true"
        }
    }
}' || echo "Datastore may already exist"

# Function to create a layer from PostGIS table
create_postgis_layer() {
    local table_name=$1
    local layer_name=$2
    local title=$3

    echo "Creating layer: $layer_name from table: $table_name"

    # Create feature type
    geoserver_curl -X POST "$GEOSERVER_URL/workspaces/maapallo/datastores/postgis_maapallo/featuretypes" -d '{
        "featureType": {
            "name": "'$table_name'",
            "nativeName": "'$table_name'",
            "title": "'$title'",
            "abstract": "'$title' layer for Maapallo GIS application",
            "keywords": {
                "string": ["'$layer_name'", "gis", "education", "finland"]
            },
            "srs": "EPSG:4326",
            "nativeBoundingBox": {
                "minx": -180,
                "maxx": 180,
                "miny": -90,
                "maxy": 90,
                "crs": "EPSG:4326"
            },
            "latLonBoundingBox": {
                "minx": -180,
                "maxx": 180,
                "miny": -90,
                "maxy": 90,
                "crs": "EPSG:4326"
            },
            "enabled": true,
            "metadata": {
                "entry": [
                    {"@key": "cachingEnabled", "$": "true"},
                    {"@key": "cacheAgeMax", "$": "3600"},
                    {"@key": "time", "$": "false"}
                ]
            }
        }
    }' || echo "Feature type $layer_name may already exist"
}

# Wait a bit more for PostGIS connection to be ready
echo "Waiting for PostGIS connection..."
sleep 10

# Create layers (these will be created when data is loaded into PostGIS)
# For now, we'll set up the configuration to handle these tables when they exist

echo "✅ Maapallo GeoServer configuration completed!"
echo "🌍 Available at: http://localhost:8081/geoserver"
echo "🔑 Admin credentials: admin/geoserver"
echo ""
echo "Next steps:"
echo "1. Load your GIS data into PostGIS database"
echo "2. Use the GeoServer admin interface to configure layers"
echo "3. Test WMS/WFS endpoints for your application"
