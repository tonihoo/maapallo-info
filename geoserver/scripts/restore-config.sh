#!/bin/bash

# Enhanced GeoServer Initialization Script with Database-Driven Configuration
# Automatically restores workspaces, datastores, and layers from PostgreSQL on startup

set -Eeuo pipefail
IFS=$'\n\t'

# Debug tracing (export DEBUG_RESTORE=1 to enable verbose tracing)
if [[ "${DEBUG_RESTORE:-}" == "1" || "${DEBUG_RESTORE:-}" == "true" ]]; then
    set -x
fi

# Configuration from environment variables
GEOSERVER_URL="${GEOSERVER_INTERNAL_URL:-${GEOSERVER_URL:-http://localhost:8080/geoserver}}"
GEOSERVER_ADMIN_USER="${GEOSERVER_ADMIN_USER:-admin}"
GEOSERVER_ADMIN_PASSWORD="${GEOSERVER_ADMIN_PASSWORD:-geoserver}"

# PostgreSQL connection parameters (canonical POSTGRES_* with legacy fallbacks)
# Precedence: explicit POSTGRES_* > legacy DB_ADMIN_*/DB_NAME > PG_* > hard-coded default
POSTGRES_HOST="${POSTGRES_HOST:-${PG_HOST:-localhost}}"
POSTGRES_PORT="${POSTGRES_PORT:-${PG_PORT:-5432}}"
POSTGRES_DB="${POSTGRES_DB:-${DB_NAME:-${PG_DB:-maapallo_info}}}"
POSTGRES_USER="${POSTGRES_USER:-${DB_ADMIN_USER:-${PG_USER:-postgres}}}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-${DB_ADMIN_PASSWORD:-${POSTGRES_PASS:-${PG_PASSWORD:-postgres}}}}"
POSTGRES_SSLMODE="${POSTGRES_SSLMODE:-${PG_SSLMODE:-require}}"

# Logging helpers
log()  { echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }
info() { log "INFO  $*"; }
warn() { log "WARN  $*"; }
error(){ log "ERROR $*"; }

# Optional persistent log file (can be disabled with PERSIST_RESTORE_LOG=0)
RESTORE_LOG_FILE="${RESTORE_LOG_FILE:-/opt/geoserver/data_dir/restore-config.log}"
if [[ "${PERSIST_RESTORE_LOG:-1}" == "1" ]]; then
    # Ensure directory exists
    mkdir -p "$(dirname "$RESTORE_LOG_FILE")" || true
    # Redirect all subsequent stdout/stderr through tee (append mode)
    exec > >(tee -a "$RESTORE_LOG_FILE") 2>&1
    echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] INFO  🔄 Restore script log persisted to $RESTORE_LOG_FILE"
fi

# Error handling
trap 'error "Configuration restoration failed at line $LINENO (exit=$?)"; exit 1' ERR

# Summarize critical env (sanitized) for diagnostics
env_summary() {
    cat <<EOF
GeoServer restore environment summary:
    GEOSERVER_URL=${GEOSERVER_URL}
    GEOSERVER_ADMIN_USER=${GEOSERVER_ADMIN_USER}
    POSTGRES_HOST=${POSTGRES_HOST}
    POSTGRES_PORT=${POSTGRES_PORT}
    POSTGRES_DB=${POSTGRES_DB}
    POSTGRES_USER=${POSTGRES_USER}
    POSTGRES_SSLMODE=${POSTGRES_SSLMODE}
    RESTORE_RETRIES=${RESTORE_RETRIES:-5}
    NO_BOOTSTRAP_ON_EMPTY=${NO_BOOTSTRAP_ON_EMPTY:-0}
    DEBUG_RESTORE=${DEBUG_RESTORE:-0}
EOF
}

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

# Test database connection with retry
test_database_connection() {
    info "🔌 Testing database connection..."
    export PGPASSWORD="$POSTGRES_PASSWORD"

    local max_attempts=5
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        info "Database connection attempt $attempt/$max_attempts"

        if psql -v ON_ERROR_STOP=1 -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
            info "✅ Database connection successful"

            # Check persistence tables and update datastore config
            local health_check
            health_check=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT check_geoserver_config_health();" 2>/dev/null || echo "health_check_failed")
            info "Database health check: $health_check"

            # Update datastore connection parameters with runtime values
            info "Updating datastore connection parameters..."
            psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
                SELECT update_datastore_connection_params(
                    'maapallo',
                    'postgis',
                    '$POSTGRES_HOST',
                    $POSTGRES_PORT,
                    '$POSTGRES_DB',
                    '$POSTGRES_USER',
                    '$POSTGRES_SSLMODE'
                );
            " || warn "Failed to update datastore connection parameters"

            return 0
        else
            warn "Database connection failed, attempt $attempt/$max_attempts"
            if [ $attempt -lt $max_attempts ]; then
                sleep $((attempt * 2))  # Progressive backoff
            fi
        fi
        attempt=$((attempt + 1))
    done

    error "❌ Database connection failed after $max_attempts attempts"
    return 1
}

# Get configuration from database
get_configuration_from_db() {
    info "📖 Reading GeoServer configuration from database..."

    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Table counts for diagnostics first
    local counts_sql="SELECT (SELECT count(*) FROM geoserver_workspaces) AS workspaces, (SELECT count(*) FROM geoserver_datastores) AS datastores, (SELECT count(*) FROM geoserver_layers) AS layers;"
    local counts
    if counts=$(psql -v ON_ERROR_STOP=1 -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -F '|' -c "$counts_sql" 2>&1); then
        local w d l
        IFS='|' read -r w d l <<<"$counts"
        info "   Persistence table counts: workspaces=$w datastores=$d layers=$l"
    else
        warn "   Could not fetch table counts: $counts"
    fi

    # Query configuration directly via LEFT JOINs
    local sql="SELECT w.name AS workspace_name, w.description AS workspace_description,\n"
    sql+="       d.name AS datastore_name, d.type AS datastore_type, d.connection_params AS datastore_params,\n"
    sql+="       l.layer_name, l.table_name, l.geom_column, l.srid, l.layer_config\n"
    sql+="FROM geoserver_workspaces w\n"
    sql+="LEFT JOIN geoserver_datastores d ON d.workspace_name = w.name\n"
    sql+="LEFT JOIN geoserver_layers l ON l.workspace_name = w.name AND l.datastore_name = d.name\n"
    sql+="ORDER BY w.name, d.name, l.layer_name;"

    local result
    if ! result=$(psql -v ON_ERROR_STOP=1 -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" -t -A -F '|' -c "$sql" 2>&1); then
        warn "Failed to query configuration (psql error): $result"
        return 1
    fi

    # Record raw line count (excluding empty)
    local non_empty_lines
    non_empty_lines=$(echo "$result" | grep -Ev '^[[:space:]]*$' | wc -l | tr -d ' ')
    info "   Retrieved config row lines: $non_empty_lines"

    if [[ -z "${result// /}" ]]; then
        warn "No configuration rows returned by join query"
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

    # Get configuration from database with retry/backoff to avoid
    # mistakenly bootstrapping during transient DB issues.
    local config_data
    local attempts=0
    local max_attempts="${RESTORE_RETRIES:-5}"
    local backoff=1
    while true; do
        if config_data=$(get_configuration_from_db); then
            break
        fi
        attempts=$((attempts+1))
        if [[ $attempts -ge $max_attempts ]]; then
            warn "Configuration still unavailable after ${attempts} attempts"
            break
        fi
        info "Retrying configuration fetch in ${backoff}s (attempt ${attempts}/${max_attempts})..."
        sleep $backoff
        # Fibonacci-ish backoff: 1,2,3,5,8...
        if [[ $backoff -lt 5 ]]; then
            backoff=$((backoff+1))
        else
            backoff=$((backoff+3))
        fi
    done

    if [[ -z "${config_data// /}" ]]; then
        if [[ "${NO_BOOTSTRAP_ON_EMPTY:-0}" == "1" ]]; then
            warn "No stored configuration after retries AND NO_BOOTSTRAP_ON_EMPTY=1 -> skipping bootstrap (manual intervention required)"
            return 0
        else
            warn "No stored configuration found after retries. Bootstrapping default configuration. (Set NO_BOOTSTRAP_ON_EMPTY=1 to suppress)"
            bootstrap_default_configuration
            return 0
        fi
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

# Bootstrap a minimal default configuration when persistence tables are empty.
bootstrap_default_configuration() {
    local default_workspace="${DEFAULT_GEOSERVER_WORKSPACE:-maapallo}"
    local default_datastore="${DEFAULT_GEOSERVER_DATASTORE:-postgis_maapallo}"
    info "🆕 Bootstrapping default workspace='$default_workspace' datastore='$default_datastore'"

    # Create workspace if missing
    create_workspace "$default_workspace" "Default Maapallo workspace"

    # Create datastore if missing
    create_datastore "$default_workspace" "$default_datastore" "{}"

    info "✅ Default GeoServer configuration bootstrapped"
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

# Guard against running restore on non-empty data_dir
should_run_restore() {
    # If data_dir has workspaces but missing expected workspace, run restore
    if [ -d "/opt/geoserver/data_dir/workspaces" ]; then
        if [ ! -d "/opt/geoserver/data_dir/workspaces/${WORKSPACE_NAME:-maapallo}" ]; then
            info "🔄 Workspace directory exists but missing expected workspace - running restore"
            return 0
        fi

        # Check if workspace has any actual content
        local ws_count
        ws_count=$(find "/opt/geoserver/data_dir/workspaces" -name "*.xml" | wc -l)
        if [ "$ws_count" -eq 0 ]; then
            info "🔄 Workspace directory empty - running restore"
            return 0
        fi

        info "ℹ️ Workspaces directory appears populated - skipping restore"
        return 1
    else
        info "🔄 No workspaces directory - running restore"
        return 0
    fi
}

# Main execution with guards
main() {
    info "🚀 Starting enhanced GeoServer initialization..."
    env_summary | while read -r line; do info "$line"; done

    # Wait for services
    wait_for_service "GeoServer" "$GEOSERVER_URL/web/"

    # Test database connection
    test_database_connection

    # Only run restore if needed
    if should_run_restore; then
        restore_geoserver_configuration
    else
        info "ℹ️ Skipping configuration restoration (data_dir appears populated)"
    fi

    # Always verify final configuration
    verify_configuration

    info "🎉 GeoServer initialization completed successfully!"
}

# Run main function
main "$@"
