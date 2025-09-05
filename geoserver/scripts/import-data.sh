#!/bin/bash

# Data Import Script for GeoServer + PostGIS
# Supports GeoJSON, GeoPackage (.gpkg), and Shapefiles (.zip)
# Uses system GDAL tools for reliable data import

set -e

POSTGRES_HOST=${POSTGRES_HOST:-db}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_DB=${POSTGRES_DB:-db_dev}
POSTGRES_USER=${POSTGRES_USER:-db_dev_user}
POSTGRES_PASS=${POSTGRES_PASS:-DevPassword}

UPLOADS_DIR="/opt/geoserver/uploads"
TEMP_DIR="/tmp/geoserver_import"

echo "🗺️  GeoServer Data Import Utility"
echo "=================================="

# Function to import GeoJSON
import_geojson() {
    local file_path="$1"
    local table_name="$2"

    echo "📁 Importing GeoJSON: $file_path -> $table_name"

    ogr2ogr -f "PostgreSQL" \
        "PG:host=$POSTGRES_HOST port=$POSTGRES_PORT dbname=$POSTGRES_DB user=$POSTGRES_USER password=$POSTGRES_PASS" \
        "$file_path" \
        -nln "$table_name" \
        -overwrite \
        -lco GEOMETRY_NAME=geom \
        -lco FID=gid \
        -a_srs EPSG:4326
}

# Function to import GeoPackage
import_geopackage() {
    local file_path="$1"
    local table_name="$2"

    echo "📦 Importing GeoPackage: $file_path -> $table_name"

    ogr2ogr -f "PostgreSQL" \
        "PG:host=$POSTGRES_HOST port=$POSTGRES_PORT dbname=$POSTGRES_DB user=$POSTGRES_USER password=$POSTGRES_PASS" \
        "$file_path" \
        -nln "$table_name" \
        -overwrite \
        -lco GEOMETRY_NAME=geom \
        -lco FID=gid \
        -a_srs EPSG:4326
}

# Function to import Shapefile
import_shapefile() {
    local zip_path="$1"
    local table_name="$2"

    echo "🗂️  Importing Shapefile: $zip_path -> $table_name"

    # Create temporary directory
    mkdir -p "$TEMP_DIR"

    # Extract shapefile
    unzip -o "$zip_path" -d "$TEMP_DIR/"

    # Find the .shp file
    shp_file=$(find "$TEMP_DIR" -name "*.shp" | head -1)

    if [ -z "$shp_file" ]; then
        echo "❌ No .shp file found in the archive"
        rm -rf "$TEMP_DIR"
        return 1
    fi

    ogr2ogr -f "PostgreSQL" \
        "PG:host=$POSTGRES_HOST port=$POSTGRES_PORT dbname=$POSTGRES_DB user=$POSTGRES_USER password=$POSTGRES_PASS" \
        "$shp_file" \
        -nln "$table_name" \
        -overwrite \
        -lco GEOMETRY_NAME=geom \
        -lco FID=gid \
        -a_srs EPSG:4326

    # Cleanup
    rm -rf "$TEMP_DIR"
}

# Function to create GeoServer layer
create_geoserver_layer() {
    local table_name="$1"
    local workspace="maapallo"

    echo "🌍 Creating GeoServer layer for: $table_name"

    # Wait for GeoServer to be ready
    until curl -s http://localhost:8080/geoserver/web/ > /dev/null; do
        echo "⏳ Waiting for GeoServer..."
        sleep 5
    done

    # Create datastore if it doesn't exist
    curl -u admin:geoserver -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"dataStore\": {
                \"name\": \"postgis_maapallo\",
                \"connectionParameters\": {
                    \"host\": \"$POSTGRES_HOST\",
                    \"port\": \"$POSTGRES_PORT\",
                    \"database\": \"$POSTGRES_DB\",
                    \"user\": \"$POSTGRES_USER\",
                    \"passwd\": \"$POSTGRES_PASS\",
                    \"dbtype\": \"postgis\"
                }
            }
        }" \
        "http://localhost:8080/geoserver/rest/workspaces/$workspace/datastores" 2>/dev/null || true

    # Create layer
    curl -u admin:geoserver -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"featureType\": {
                \"name\": \"$table_name\",
                \"nativeName\": \"$table_name\",
                \"title\": \"$table_name\",
                \"srs\": \"EPSG:4326\",
                \"enabled\": true
            }
        }" \
        "http://localhost:8080/geoserver/rest/workspaces/$workspace/datastores/postgis_maapallo/featuretypes" 2>/dev/null || true

    echo "✅ Layer '$table_name' created successfully"
}

# Main import function
import_file() {
    local file_path="$1"
    local table_name="$2"

    if [ ! -f "$file_path" ]; then
        echo "❌ File not found: $file_path"
        return 1
    fi

    if [ -z "$table_name" ]; then
        # Generate table name from filename
        table_name=$(basename "$file_path" | sed 's/\.[^.]*$//' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g')
    fi

    echo "📊 Processing: $file_path"
    echo "📝 Table name: $table_name"

    case "${file_path,,}" in
        *.geojson)
            import_geojson "$file_path" "$table_name"
            ;;
        *.gpkg)
            import_geopackage "$file_path" "$table_name"
            ;;
        *.zip)
            import_shapefile "$file_path" "$table_name"
            ;;
        *)
            echo "❌ Unsupported file format. Supported: .geojson, .gpkg, .zip (shapefile)"
            return 1
            ;;
    esac

    create_geoserver_layer "$table_name"
    echo "🎉 Import completed successfully!"
}

# Process uploads directory
process_uploads() {
    echo "🔍 Scanning uploads directory: $UPLOADS_DIR"

    if [ ! -d "$UPLOADS_DIR" ]; then
        echo "📁 Creating uploads directory..."
        mkdir -p "$UPLOADS_DIR"
        return
    fi

    for file in "$UPLOADS_DIR"/*; do
        if [ -f "$file" ]; then
            echo "🔄 Processing: $(basename "$file")"
            import_file "$file"

            # Move processed file to archive
            mkdir -p "$UPLOADS_DIR/processed"
            mv "$file" "$UPLOADS_DIR/processed/"
        fi
    done
}

# Main execution
if [ $# -eq 0 ]; then
    # No arguments - process uploads directory
    process_uploads
elif [ $# -eq 1 ]; then
    # One argument - import specific file
    import_file "$1"
elif [ $# -eq 2 ]; then
    # Two arguments - import file with custom table name
    import_file "$1" "$2"
else
    echo "Usage:"
    echo "  $0                    # Process all files in uploads directory"
    echo "  $0 <file>             # Import specific file"
    echo "  $0 <file> <table>     # Import file with custom table name"
fi
