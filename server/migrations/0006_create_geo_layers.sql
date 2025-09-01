-- 0006_create_geo_layers.sql
-- Create generic tables for serving layers from PostGIS

-- geo_layers holds layer metadata
CREATE TABLE IF NOT EXISTS geo_layers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) UNIQUE NOT NULL,
    title VARCHAR(255),
    geom_type VARCHAR(32) DEFAULT 'GEOMETRY',
    srid INTEGER DEFAULT 4326,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- geo_features holds features per layer in SRID 4326
CREATE TABLE IF NOT EXISTS geo_features (
    id SERIAL PRIMARY KEY,
    layer_id INTEGER NOT NULL REFERENCES geo_layers(id) ON DELETE CASCADE,
    properties JSONB,
    geom GEOMETRY(GEOMETRY, 4326) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_geo_features_layer ON geo_features (layer_id);
CREATE INDEX IF NOT EXISTS idx_geo_features_geom ON geo_features USING GIST (geom);
