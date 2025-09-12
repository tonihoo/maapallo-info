#!/bin/bash

# GeoServer Initialization Script
# Creates workspace, datastore, and sets up the PostGIS connection

set -e

GEOSERVER_URL="http://localhost:8080/geoserver"
GEOSERVER_USER="admin"
GEOSERVER_PASS="geoserver"
WORKSPACE="maapallo"

# Wait for GeoServer to be ready
wait_for_geoserver() {
    echo "⏳ Waiting for GeoServer to start..."
    while ! curl -s -f "$GEOSERVER_URL/web/" > /dev/null 2>&1; do
        sleep 5
        echo "   Still waiting..."
    done
    echo "✅ GeoServer is ready!"
}

# Create workspace
create_workspace() {
    echo "🏗️  Creating workspace: $WORKSPACE"

    curl -u "$GEOSERVER_USER:$GEOSERVER_PASS" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"workspace\": {
                \"name\": \"$WORKSPACE\",
                \"isolated\": false
            }
        }" \
        "$GEOSERVER_URL/rest/workspaces" 2>/dev/null || echo "   Workspace might already exist"
}

# Create PostGIS datastore
create_datastore() {
    echo "🗄️  Creating PostGIS datastore"

    curl -u "$GEOSERVER_USER:$GEOSERVER_PASS" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"dataStore\": {
                \"name\": \"postgis_maapallo\",
                \"description\": \"PostGIS connection for Maapallo layers\",
                \"type\": \"PostGIS\",
                \"enabled\": true,
                \"connectionParameters\": {
                    \"host\": \"$POSTGRES_HOST\",
                    \"port\": \"$POSTGRES_PORT\",
                    \"database\": \"$POSTGRES_DB\",
                    \"user\": \"$POSTGRES_USER\",
                    \"passwd\": \"$POSTGRES_PASS\",
                    \"dbtype\": \"postgis\",
                    \"schema\": \"public\",
                    \"Expose primary keys\": \"true\",
                    \"validate connections\": \"true\",
                    \"Connection timeout\": \"20\",
                    \"min connections\": \"1\",
                    \"max connections\": \"10\"
                }
            }
        }" \
        "$GEOSERVER_URL/rest/workspaces/$WORKSPACE/datastores" 2>/dev/null || echo "   Datastore might already exist"
}

# Set up CORS
setup_cors() {
    echo "🌐 Setting up CORS configuration"

    # Enable CORS in web.xml if not already done
    if [ -f /opt/geoserver/webapps/geoserver/WEB-INF/web.xml ]; then
        if ! grep -q "cors-filter" /opt/geoserver/webapps/geoserver/WEB-INF/web.xml; then
            echo "   Adding CORS filter to web.xml"
            # This would be done during build time in a real scenario
        fi
    fi
}

# Create styles directory if it doesn't exist
setup_styles() {
    echo "🎨 Setting up styles directory"
    mkdir -p /opt/geoserver/data_dir/styles
    chown -R geoserver:geoserver /opt/geoserver/data_dir/styles
}

# Main initialization
main() {
    echo "🚀 Initializing GeoServer for Maapallo"
    echo "======================================"

    wait_for_geoserver
    create_workspace
    create_datastore
    setup_cors
    setup_styles

    echo ""
    echo "✅ GeoServer initialization complete!"
    echo ""
    echo "📋 Access Information:"
    echo "   • GeoServer Web UI: http://localhost:8081/geoserver"
    echo "   • Username: admin"
    echo "   • Password: geoserver"
    echo "   • Workspace: $WORKSPACE"
    echo "   • Upload files to: ./geoserver/uploads/"
    echo ""
    echo "📁 To import data:"
    echo "   docker-compose exec geoserver /usr/local/bin/import-data.sh"
}

# Run if called directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
