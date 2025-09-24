#!/bin/bash

# GeoServer Initialization Script
# Creates workspace, datastore, and sets up the PostGIS connection

set -Eeuo pipefail
IFS=$'\n\t'

# Config (override via environment variables if needed)
GEOSERVER_URL="${GEOSERVER_URL:-http://localhost:8080/geoserver}"        # Internal URL from inside the container
GEOSERVER_USER="${GEOSERVER_USER:-admin}"
GEOSERVER_PASS="${GEOSERVER_PASS:-geoserver}"
WORKSPACE="${WORKSPACE:-maapallo}"
DATASTORE="${DATASTORE:-postgis_maapallo}"
SRC_DIR="${SRC_DIR:-/opt/geoserver/source_data}"

# Postgres connection (canonical names). Support legacy POSTGRES_PASS via fallback.
POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-${DB_NAME:-maapallo}}"
POSTGRES_USER="${POSTGRES_USER:-${DB_ADMIN_USER:-postgres}}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-${POSTGRES_PASS:-${DB_ADMIN_PASSWORD:-postgres}}}"

# Logging helpers
log()  { echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }
info() { log "INFO  $*"; }
warn() { log "WARN  $*"; }
error(){ log "ERROR $*"; }

trap 'error "Failed at line $LINENO"; exit 1' ERR

# Wait for GeoServer to be ready
wait_for_geoserver() {
    info "⏳ Waiting for GeoServer to start at $GEOSERVER_URL ..."
    local tries=0
    local max_tries=60   # ~5 minutes
    until curl -sSf "$GEOSERVER_URL/web/" > /dev/null 2>&1; do
        tries=$((tries+1))
        if [[ $tries -ge $max_tries ]]; then
            error "GeoServer did not become ready after $((max_tries*5)) seconds"
            return 1
        fi
        sleep 5
        info "   Still waiting ($tries/$max_tries) ..."
    done
    info "✅ GeoServer is ready"
}

# Create workspace
create_workspace() {
    info "🏗️  Ensuring workspace exists: $WORKSPACE"
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" -u "$GEOSERVER_USER:$GEOSERVER_PASS" \
        "$GEOSERVER_URL/rest/workspaces/$WORKSPACE.json") || code=0

    if [[ "$code" == "200" ]]; then
        info "   ✅ Workspace '$WORKSPACE' already exists"
        return 0
    fi

    info "   Creating workspace '$WORKSPACE'"
    curl -sS -u "$GEOSERVER_USER:$GEOSERVER_PASS" \
        -X POST \
        -H "Content-Type: application/json" \
        -d @- \
        "$GEOSERVER_URL/rest/workspaces" >/dev/null <<'JSON'
{ "workspace": { "name": "$WORKSPACE", "isolated": false } }
JSON
    info "   ✅ Workspace created"
}

# Create PostGIS datastore
create_datastore() {
    info "🗄️  Ensuring PostGIS datastore exists: $DATASTORE"

    # Validate connection parameters
    if [[ -z "$POSTGRES_HOST" || -z "$POSTGRES_DB" || -z "$POSTGRES_USER" || -z "$POSTGRES_PASSWORD" ]]; then
        warn "   Missing Postgres connection parameters; using defaults where applicable"
    fi

    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" -u "$GEOSERVER_USER:$GEOSERVER_PASS" \
        "$GEOSERVER_URL/rest/workspaces/$WORKSPACE/datastores/$DATASTORE.json") || code=0

    if [[ "$code" == "200" ]]; then
        info "   ✅ Datastore '$DATASTORE' already exists"
        return 0
    fi

        info "   Creating datastore '$DATASTORE'"
        curl -sS -u "$GEOSERVER_USER:$GEOSERVER_PASS" \
            -X POST \
            -H "Content-Type: application/json" \
            -d @- \
            "$GEOSERVER_URL/rest/workspaces/$WORKSPACE/datastores" >/dev/null <<'JSON'
{
    "dataStore": {
        "name": "$DATASTORE",
        "description": "PostGIS connection for Maapallo layers",
        "type": "PostGIS",
        "enabled": true,
        "connectionParameters": {
            "host": "$POSTGRES_HOST",
            "port": "$POSTGRES_PORT",
            "database": "$POSTGRES_DB",
            "user": "$POSTGRES_USER",
            "passwd": "$POSTGRES_PASSWORD",
            "dbtype": "postgis",
            "schema": "public",
            "Expose primary keys": "true",
            "validate connections": "true",
            "Connection timeout": "20",
            "min connections": "1",
            "max connections": "10"
        }
    }
}
JSON
    info "   ✅ Datastore created"
}

# Set up CORS
setup_cors() {
    info "🌐 CORS configuration"
    # Note: Proper CORS setup is best done at image build time or via reverse proxy.
    # This function is a placeholder to keep init idempotent and minimal.
}

# Create styles directory if it doesn't exist
setup_styles() {
    info "🎨 Setting up styles directory"
    mkdir -p /opt/geoserver/data_dir/styles
    if id -u geoserver >/dev/null 2>&1; then
        chown -R geoserver:geoserver /opt/geoserver/data_dir/styles
    else
        warn "   User 'geoserver' not found; skipping chown on styles directory"
    fi
}

# Check if a layer exists (published) in GeoServer
layer_exists() {
    local layer_name="$1"
    curl -s -f -u "$GEOSERVER_USER:$GEOSERVER_PASS" \
        "$GEOSERVER_URL/rest/layers/$WORKSPACE:$layer_name.json" > /dev/null 2>&1
}

# Seed default layers from mounted source data into PostGIS and publish them
seed_default_layers() {
    info "🌱 Seeding default layers (if missing)"

    # Ensure source directory exists
    if [ ! -d "$SRC_DIR" ]; then
        warn "   Source data directory not found: $SRC_DIR (skipping seed)"
        return
    fi

    # Map: file -> target table/layer name
    declare -A FILES
    FILES["$SRC_DIR/world.geojson"]="world"
    FILES["$SRC_DIR/pop_density_by_country_2022_num.geojson"]="pop_density_by_country_2022_num"
    FILES["$SRC_DIR/intact-forest-landscapes-simplified-2020.geojson"]="intact_forests"

    for file in "${!FILES[@]}"; do
        table_name="${FILES[$file]}"
        if layer_exists "$table_name"; then
            info "   ✅ Layer '$table_name' already exists, skipping"
            continue
        fi

        if [ -f "$file" ]; then
            info "   ➕ Importing and publishing: $(basename "$file") -> $table_name"
            if [ ! -x "/usr/local/bin/import-data.sh" ]; then
                error "   Import script not found or not executable: /usr/local/bin/import-data.sh"
                continue
            fi
            /usr/local/bin/import-data.sh "$file" "$table_name" || {
                error "   Failed to import $file"
                continue
            }
        else
            warn "   File not found: $file (skipping)"
        fi
    done

    # Helpful hints for optional layers not present by default
    if ! layer_exists "adult_literacy"; then
        info "   ℹ️ Layer 'adult_literacy' not seeded (no source file)."
        info "      • Add a prepared GeoJSON as $SRC_DIR/adult_literacy.geojson"
        info "      • Or generate it in PostGIS, then publish via GeoServer UI or script"
    fi
}

# Main initialization
main() {
    info "🚀 Initializing GeoServer for Maapallo"
    info "======================================"

    wait_for_geoserver
    create_workspace
    create_datastore
    setup_cors
    setup_styles
    seed_default_layers

    echo ""
    info "✅ GeoServer initialization complete!"
    echo ""
    info "📋 Access Information:"
    info "   • Username: $GEOSERVER_USER"
    info "   • Workspace: $WORKSPACE"
    echo ""
    info "📁 To import data manually:"
    info "   docker compose exec geoserver /usr/local/bin/import-data.sh /path/to/file.geojson <layer_name>"
}

# Run if called directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
