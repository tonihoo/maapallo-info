-- Migration to import population density data from GeoJSON
-- This migration imports the actual data exported from QGIS

-- Note: This SQL is generated to import the GeoJSON data
-- In production, you would either:
-- 1. Run this migration after uploading the GeoJSON file
-- 2. Use ogr2ogr to import the GeoJSON directly
-- 3. Use the PostGIS import functions with the GeoJSON data

-- For production deployment, use one of these approaches:

-- APPROACH 1: Direct import using psql and ogr2ogr
-- ogr2ogr -f "PostgreSQL" "PG:host=your-azure-db port=5432 user=username password=password dbname=dbname" \
--         pop_density_by_country_2022_num.geojson \
--         -nln pop_density_by_country_2022_num \
--         -overwrite

-- APPROACH 2: Import via Azure Database for PostgreSQL
-- 1. Upload GeoJSON to Azure Storage or App Service
-- 2. Use Azure Cloud Shell with ogr2ogr
-- 3. Connect to your Azure PostgreSQL database

-- APPROACH 3: Application-level import
-- Use the FastAPI server to read the GeoJSON and insert data via SQLAlchemy

-- This file serves as documentation for the data import process
-- The actual data import should be done using the GeoJSON file at:
-- client/public/data/pop_density_by_country_2022_num.geojson

SELECT 'Population density data import - see migration comments for import instructions' as status;
