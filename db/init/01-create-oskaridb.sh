#!/bin/bash
# First-boot database for the Oskari Java backend.
# Existing volumes are handled again by the Oskari container entrypoint.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'oskari') THEN
    CREATE ROLE oskari LOGIN PASSWORD 'oskari';
  END IF;
END
$$;
SQL

if ! psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'oskaridb'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "CREATE DATABASE oskaridb OWNER oskari"
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname oskaridb <<'SQL'
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
GRANT ALL ON SCHEMA public TO oskari;
SQL
