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
        'host', 'maapallo-db-server.postgres.database.azure.com',
        'port', 5432,
        'database', 'maapallo_info',
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