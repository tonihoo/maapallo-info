-- GeoServer Configuration Persistence Schema
-- Migration to add tables for storing GeoServer configuration

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

-- Insert default PostGIS datastore configuration
INSERT INTO geoserver_datastores (workspace_name, name, type, connection_params)
VALUES (
    'maapallo',
    'postgis',
    'postgis',
    jsonb_build_object(
        'host', CASE
            WHEN current_setting('server_version_num')::int >= 120000
            THEN 'maapallo-db-server.postgres.database.azure.com'
            ELSE 'localhost'
        END,
        'port', 5432,
        'database', 'maapallo-db',
        'schema', 'public',
        'user', 'maapallo_admin',
        'dbtype', 'postgis',
        'Loose bbox', true,
        'Estimated extends', false,
        'validate connections', true,
        'Connection timeout', 20,
        'preparedStatements', false
    )
) ON CONFLICT (workspace_name, name) DO NOTHING;

-- Function to register a new layer configuration
CREATE OR REPLACE FUNCTION register_geoserver_layer(
    p_workspace_name VARCHAR(255),
    p_datastore_name VARCHAR(255),
    p_layer_name VARCHAR(255),
    p_table_name VARCHAR(255),
    p_geom_column VARCHAR(255) DEFAULT 'geom',
    p_srid INTEGER DEFAULT NULL,
    p_layer_config JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO geoserver_layers (
        workspace_name, datastore_name, layer_name, table_name,
        geom_column, srid, layer_config, updated_at
    ) VALUES (
        p_workspace_name, p_datastore_name, p_layer_name, p_table_name,
        p_geom_column, p_srid, p_layer_config, NOW()
    )
    ON CONFLICT (workspace_name, layer_name)
    DO UPDATE SET
        datastore_name = EXCLUDED.datastore_name,
        table_name = EXCLUDED.table_name,
        geom_column = EXCLUDED.geom_column,
        srid = EXCLUDED.srid,
        layer_config = EXCLUDED.layer_config,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get all layer configurations for restoration
CREATE OR REPLACE FUNCTION get_geoserver_configuration()
RETURNS TABLE(
    workspace_name VARCHAR(255),
    workspace_description TEXT,
    datastore_name VARCHAR(255),
    datastore_type VARCHAR(50),
    datastore_params JSONB,
    layer_name VARCHAR(255),
    table_name VARCHAR(255),
    geom_column VARCHAR(255),
    srid INTEGER,
    layer_config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.name as workspace_name,
        w.description as workspace_description,
        d.name as datastore_name,
        d.type as datastore_type,
        d.connection_params as datastore_params,
        l.layer_name,
        l.table_name,
        l.geom_column,
        l.srid,
        l.layer_config
    FROM geoserver_workspaces w
    LEFT JOIN geoserver_datastores d ON w.name = d.workspace_name
    LEFT JOIN geoserver_layers l ON d.workspace_name = l.workspace_name
                                AND d.name = l.datastore_name
    ORDER BY w.name, d.name, l.layer_name;
END;
$$ LANGUAGE plpgsql;
