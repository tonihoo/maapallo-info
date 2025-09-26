-- GeoServer Configuration Persistence Schema - Enhanced Version
-- Migration to add tables for storing GeoServer configuration

-- Add migration tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_history') THEN
        CREATE TABLE migration_history (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT NOW(),
            notes TEXT
        );
    END IF;
END $$;

-- Log this migration execution
INSERT INTO migration_history (migration_name, notes)
VALUES ('0005_geoserver_persistence', 'Enhanced GeoServer persistence with diagnostic functions')
ON CONFLICT (migration_name)
DO UPDATE SET executed_at = NOW(), notes = EXCLUDED.notes;

-- Table to track configured workspaces
CREATE TABLE IF NOT EXISTS geoserver_workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table to track configured datastores
CREATE TABLE IF NOT EXISTS geoserver_datastores (
    id SERIAL PRIMARY KEY,
    workspace_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'postgis',
    connection_params JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(workspace_name, name),
    FOREIGN KEY (workspace_name) REFERENCES geoserver_workspaces(name) ON DELETE CASCADE
);

-- Table to track configured layers
CREATE TABLE IF NOT EXISTS geoserver_layers (
    id SERIAL PRIMARY KEY,
    workspace_name VARCHAR(255) NOT NULL,
    datastore_name VARCHAR(255) NOT NULL,
    layer_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    geom_column VARCHAR(255) DEFAULT 'geom',
    srid INTEGER,
    layer_config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(workspace_name, layer_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_geoserver_datastores_workspace ON geoserver_datastores(workspace_name);
CREATE INDEX IF NOT EXISTS idx_geoserver_layers_workspace ON geoserver_layers(workspace_name);
CREATE INDEX IF NOT EXISTS idx_geoserver_layers_table ON geoserver_layers(table_name);

-- Insert default workspace configuration
INSERT INTO geoserver_workspaces (name, description)
VALUES ('maapallo', 'Main workspace for Maapallo GIS layers')
ON CONFLICT (name) DO NOTHING;

-- Insert default PostGIS datastore configuration with runtime placeholders
INSERT INTO geoserver_datastores (workspace_name, name, type, connection_params)
VALUES (
    'maapallo',
    'postgis',
    'postgis',
    jsonb_build_object(
        'dbtype', 'postgis',
        'schema', 'public',
        'Loose bbox', true,
        'Estimated extends', false,
        'validate connections', true,
        'Connection timeout', 20,
        'preparedStatements', false,
        'placeholder_note', 'Connection params will be updated by restore script with runtime values'
    )
) ON CONFLICT (workspace_name, name) DO NOTHING;

-- Enhanced function to safely update datastore connection parameters
CREATE OR REPLACE FUNCTION update_datastore_connection_params(
    p_workspace_name TEXT,
    p_datastore_name TEXT,
    p_host TEXT,
    p_port INTEGER,
    p_database TEXT,
    p_user TEXT,
    p_sslmode TEXT DEFAULT 'require'
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE geoserver_datastores
    SET connection_params = jsonb_build_object(
        'host', p_host,
        'port', p_port,
        'database', p_database,
        'user', p_user,
        'dbtype', 'postgis',
        'schema', 'public',
        'sslmode', p_sslmode,
        'Loose bbox', true,
        'Estimated extends', false,
        'validate connections', true,
        'Connection timeout', 20,
        'preparedStatements', false,
        'updated_by', 'restore_script',
        'updated_at', CURRENT_TIMESTAMP
    ),
    updated_at = NOW()
    WHERE workspace_name = p_workspace_name
    AND name = p_datastore_name;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Diagnostic function to check GeoServer configuration health
CREATE OR REPLACE FUNCTION check_geoserver_config_health()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check workspace count
    RETURN QUERY
    SELECT
        'workspace_count'::TEXT,
        CASE WHEN (SELECT count(*) FROM geoserver_workspaces) > 0 THEN 'OK' ELSE 'MISSING' END,
        'Workspaces: ' || (SELECT count(*)::TEXT FROM geoserver_workspaces);

    -- Check datastore count
    RETURN QUERY
    SELECT
        'datastore_count'::TEXT,
        CASE WHEN (SELECT count(*) FROM geoserver_datastores) > 0 THEN 'OK' ELSE 'MISSING' END,
        'Datastores: ' || (SELECT count(*)::TEXT FROM geoserver_datastores);

    -- Check layer count
    RETURN QUERY
    SELECT
        'layer_count'::TEXT,
        CASE WHEN (SELECT count(*) FROM geoserver_layers) > 0 THEN 'OK' ELSE 'EMPTY' END,
        'Layers: ' || (SELECT count(*)::TEXT FROM geoserver_layers);

    -- Check for maapallo workspace specifically
    RETURN QUERY
    SELECT
        'maapallo_workspace'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM geoserver_workspaces WHERE name = 'maapallo') THEN 'OK' ELSE 'MISSING' END,
        'Maapallo workspace present';

    -- Check datastore connection params
    RETURN QUERY
    SELECT
        'datastore_config'::TEXT,
        CASE
            WHEN EXISTS(
                SELECT 1 FROM geoserver_datastores
                WHERE workspace_name = 'maapallo'
                AND connection_params ? 'placeholder_note'
            ) THEN 'PLACEHOLDER'
            WHEN EXISTS(
                SELECT 1 FROM geoserver_datastores
                WHERE workspace_name = 'maapallo'
                AND connection_params ? 'host'
            ) THEN 'CONFIGURED'
            ELSE 'MISSING'
        END,
        'Datastore configuration status';
END;
$$ LANGUAGE plpgsql;

-- Function to get current configuration summary (for debugging)
CREATE OR REPLACE FUNCTION get_geoserver_config_summary()
RETURNS TABLE (
    workspace_name TEXT,
    workspace_description TEXT,
    datastore_name TEXT,
    datastore_type TEXT,
    layer_count BIGINT,
    last_updated TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.name::TEXT,
        w.description::TEXT,
        d.name::TEXT,
        d.type::TEXT,
        COALESCE(l.layer_count, 0),
        GREATEST(w.updated_at, d.updated_at)
    FROM geoserver_workspaces w
    LEFT JOIN geoserver_datastores d ON d.workspace_name = w.name
    LEFT JOIN (
        SELECT workspace_name, datastore_name, count(*) as layer_count
        FROM geoserver_layers
        GROUP BY workspace_name, datastore_name
    ) l ON l.workspace_name = w.name AND l.datastore_name = d.name
    ORDER BY w.name, d.name;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust user as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- Log successful completion
INSERT INTO migration_history (migration_name, notes)
VALUES ('0005_geoserver_persistence_completed', 'All tables and functions created successfully')
ON CONFLICT (migration_name)
DO UPDATE SET executed_at = NOW();

-- Display current health status
SELECT * FROM check_geoserver_config_health();
