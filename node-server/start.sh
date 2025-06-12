#!/bin/sh
set -e

if [ "$PG_DATABASE" != "postgres" ]; then
  echo "Checking if database $PG_DATABASE exists..."
  PGPASSWORD=$PG_PASS psql -h $PG_HOST -U $PG_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$PG_DATABASE'" | grep -q 1 || \
  PGPASSWORD=$PG_PASS psql -h $PG_HOST -U $PG_USER -d postgres -c "CREATE DATABASE $PG_DATABASE"
  echo "Database $PG_DATABASE created or already exists"
fi

# Create node_modules symlink for global modules if needed
if [ ! -d ./node_modules/tsconfig-paths ]; then
  ln -sf /usr/local/lib/node_modules/tsconfig-paths ./node_modules/
fi

# Make sure the shared module dependencies are visible
echo "Setting up shared module access..."
mkdir -p /app/server/node_modules/@shared
ln -sf /app/shared/dist /app/server/node_modules/@shared/dist

# Install zod directly if needed
echo "Ensuring zod is installed..."
cd /app/shared && npm list zod || npm install zod
cd /app/server

# Run migrations
echo "Running migrations..."
PGOPTIONS='-c search_path=app,public' node dist/migration.js

# Start the application
echo "Starting application..."
NODE_PATH=/app/shared/node_modules:/app/server/node_modules:/usr/local/lib/node_modules NODE_OPTIONS="--require tsconfig-paths/register" node dist/app.js
