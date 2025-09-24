#!/bin/bash

# Enhanced GeoServer Initialization Script with Database-Driven Configuration
# Automatically restores workspaces, datastores, and layers from PostgreSQL on startup

set -Eeuo pipefail
IFS=$'\n\t'

# Configuration from environment variables
GEOSERVER_URL="${GEOSERVER_INTERNAL_URL:-${GEOSERVER_URL:-http://localhost:8080/geoserver}}"
GEOSERVER_ADMIN_USER="${GEOSERVER_ADMIN_USER:-admin}"
GEOSERVER_ADMIN_PASSWORD="${GEOSERVER_ADMIN_PASSWORD:-geoserver}"

# PostgreSQL connection parameters (matching Azure Container Apps environment)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${DB_NAME:-maapallo_info}"
POSTGRES_USER="${DB_ADMIN_USER:-postgres}"
POSTGRES_PASSWORD="${DB_ADMIN_PASSWORD:-postgres}"
POSTGRES_SSLMODE="${POSTGRES_SSLMODE:-require}"

# Logging helpers
log()  { echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }
info() { log "INFO  $*"; }
warn() { log "WARN  $*"; }
error(){ log "ERROR $*"; }

# Error handling
trap 'error "Configuration restoration failed at line $LINENO"; exit 1' ERR

# Wait for services to be ready
wait_for_service() {
    local service_name="$1"
    local url="$2"
    local max_tries="${3:-60}"

    info "⏳ Waiting for $service_name to be ready at $url..."
    local tries=0

    until curl -sSf "$url" > /dev/null 2>&1; do
        tries=$((tries+1))
        if [[ $tries -ge $max_tries ]]; then
            error "$service_name did not become ready after $((max_tries*5)) seconds"
            return 1
        fi
        sleep 5
        info "   Still waiting for $service_name ($tries/$max_tries)..."
    done
    info "✅ $service_name is ready"
}

# Test database connection
test_database_connection() {
    info "🔌 Testing database connection..."

    export PGPASSWORD="$POSTGRES_PASSWORD"

    if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
        info "✅ Database connection successful"
    else
        error "❌ Database connection failed"
        return 1
    fi
}

# Get configuration from database
get_configuration_from_db() {
    info "📖 Reading GeoServer configuration from database..."

    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Query configuration directly via LEFT JOINs (function removed)
    local sql="SELECT w.name AS workspace_name, w.description AS workspace_description,\n"
    sql+="       d.name AS datastore_name, d.type AS datastore_type, d.connection_params AS datastore_params,\n"
    sql+="       l.layer_name, l.table_name, l.geom_column, l.srid, l.layer_config\n"
    sql+="FROM geoserver_workspaces w\n"
    sql+="LEFT JOIN geoserver_datastores d ON d.workspace_name = w.name\n"
    sql+="LEFT JOIN geoserver_layers l ON l.workspace_name = w.name AND l.datastore_name = d.name\n"
    sql+="ORDER BY w.name, d.name, l.layer_name;"

    local result
    if ! result=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" -t -A -F '|' -c "$sql" 2>/dev/null); then
        warn "Failed to query configuration (psql error)"
        return 1
    fi

    if [[ -z "${result// /}" ]]; then
        warn "No configuration rows found in persistence tables"
        return 1
    fi

    echo "$result"
}

# Create workspace via GeoServer REST API
create_workspace() {
    local workspace_name="$1"
    local description="$2"

    info "🏗️  Creating workspace: $workspace_name"

    # Check if workspace already exists
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -u "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
        "$GEOSERVER_URL/rest/workspaces/$workspace_name.json")

    if [[ "$status_code" == "200" ]]; then
        info "   ✅ Workspace '$workspace_name' already exists"
        return 0
    fi

    # Create workspace
    local workspace_json
    workspace_json=$(cat <<EOF
{
    "workspace": {
        "name": "$workspace_name",
        "isolated": false
    }
}
EOF
    )

    status_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -u "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$workspace_json" \
        "$GEOSERVER_URL/rest/workspaces")

    if [[ "$status_code" == "201" ]]; then
        info "   ✅ Workspace '$workspace_name' created successfully"
    else
        error "   ❌ Failed to create workspace '$workspace_name' (HTTP $status_code)"
        return 1
    fi
}

# Create datastore via GeoServer REST API
create_datastore() {
    local workspace_name="$1"
    local datastore_name="$2"
    local connection_params="$3"

    info "🗄️  Creating datastore: $workspace_name:$datastore_name"

    # Check if datastore already exists
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -u "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
        "$GEOSERVER_URL/rest/workspaces/$workspace_name/datastores/$datastore_name.json")

    if [[ "$status_code" == "200" ]]; then
        info "   ✅ Datastore '$datastore_name' already exists"
        return 0
    fi

    # Build datastore JSON with connection parameters
    local datastore_json
    datastore_json=$(cat <<EOF
{
    "dataStore": {
        "name": "$datastore_name",
        "connectionParameters": {
            "host": "$POSTGRES_HOST",
            "port": "$POSTGRES_PORT",
            "database": "$POSTGRES_DB",
            "user": "$POSTGRES_USER",
            "passwd": "$POSTGRES_PASSWORD",
            "dbtype": "postgis",
            "schema": "public",
            "Loose bbox": "true",
            "Estimated extends": "false",
            "validate connections": "true",
            "Connection timeout": "20",
            "preparedStatements": "false"
        }
    }
}
EOF
    )

    status_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -u "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$datastore_json" \
        "$GEOSERVER_URL/rest/workspaces/$workspace_name/datastores")

    if [[ "$status_code" == "201" ]]; then
        info "   ✅ Datastore '$datastore_name' created successfully"
    else
        error "   ❌ Failed to create datastore '$datastore_name' (HTTP $status_code)"
        return 1
    fi
}

# Create layer via GeoServer REST API
create_layer() {
    local workspace_name="$1"
    local datastore_name="$2"
    local layer_name="$3"
    local table_name="$4"

    info "🗺️  Creating layer: $workspace_name:$layer_name"

    # Check if layer already exists
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -u "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
        "$GEOSERVER_URL/rest/workspaces/$workspace_name/datastores/$datastore_name/featuretypes/$layer_name.json")

    if [[ "$status_code" == "200" ]]; then
        info "   ✅ Layer '$layer_name' already exists"
        return 0
    fi

    # Create layer
    local layer_json
    layer_json=$(cat <<EOF
{
    "featureType": {
        "name": "$layer_name",
        "nativeName": "$table_name",
        "title": "$layer_name",
        "srs": "EPSG:4326",
        "enabled": true
    }
}
EOF
    )

    status_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -u "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$layer_json" \
        "$GEOSERVER_URL/rest/workspaces/$workspace_name/datastores/$datastore_name/featuretypes")

    if [[ "$status_code" == "201" ]]; then
        info "   ✅ Layer '$layer_name' created successfully"
    else
        warn "   ⚠️  Failed to create layer '$layer_name' (HTTP $status_code) - table might not exist"
        return 0  # Don't fail the entire process for missing tables
    fi
}

# Main configuration restoration process
restore_geoserver_configuration() {
    info "🔄 Starting GeoServer configuration restoration..."

    # Get configuration from database
    local config_data
    if ! config_data=$(get_configuration_from_db); then
        warn "No stored configuration found. Skipping restoration."
        return 0
    fi

    # Track processed workspaces and datastores to avoid duplicates
    declare -A processed_workspaces=()
    declare -A processed_datastores=()

    # Process configuration line by line
    while IFS='|' read -r workspace_name workspace_desc datastore_name datastore_type datastore_params layer_name table_name geom_column srid layer_config; do
        # Skip empty lines
        [[ -n "$workspace_name" ]] || continue

        # Create workspace if not already processed
        if [[ -z "${processed_workspaces[$workspace_name]:-}" ]]; then
            create_workspace "$workspace_name" "$workspace_desc"
            processed_workspaces[$workspace_name]=1
        fi

        # Create datastore if not already processed
        local datastore_key="$workspace_name:$datastore_name"
        if [[ -n "$datastore_name" && -z "${processed_datastores[$datastore_key]:-}" ]]; then
            create_datastore "$workspace_name" "$datastore_name" "$datastore_params"
            processed_datastores[$datastore_key]=1
        fi

        # Create layer if specified
        if [[ -n "$layer_name" && -n "$table_name" ]]; then
            create_layer "$workspace_name" "$datastore_name" "$layer_name" "$table_name"
        fi

    done <<< "$config_data"

    info "✅ GeoServer configuration restoration completed"
}

# Verify configuration
verify_configuration() {
    info "🔍 Verifying GeoServer configuration..."

    # Get list of workspaces
    local workspaces
    workspaces=$(curl -s -u "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
        "$GEOSERVER_URL/rest/workspaces.json" | \
        jq -r '.workspaces.workspace[]?.name // empty' 2>/dev/null || echo "")

    if [[ -n "$workspaces" ]]; then
        info "   ✅ Configured workspaces: $(echo "$workspaces" | tr '\n' ' ')"
    else
        warn "   ⚠️  No workspaces found"
    fi

    # Get list of layers
    local layers
    layers=$(curl -s -u "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
        "$GEOSERVER_URL/rest/layers.json" | \
        jq -r '.layers.layer[]?.name // empty' 2>/dev/null || echo "")

    if [[ -n "$layers" ]]; then
        info "   ✅ Configured layers: $(echo "$layers" | tr '\n' ' ')"
    else
        warn "   ⚠️  No layers found"
    fi
}

# Main execution
main() {
    info "🚀 Starting enhanced GeoServer initialization..."

    # Wait for services
    wait_for_service "GeoServer" "$GEOSERVER_URL/web/"

    # Test database connection
    test_database_connection

    # Restore configuration from database
    restore_geoserver_configuration

    # Verify final configuration
    verify_configuration

    info "🎉 GeoServer initialization completed successfully!"
}

# Run main function
main "$@"
