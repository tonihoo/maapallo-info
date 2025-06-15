#!/bin/sh

# Production startup script for maapallo.info
# This script runs database migrations before starting the FastAPI server

set -e

echo "🚀 Starting maapallo.info production server..."

# Debug: Show environment variables
echo "🔍 Environment check:"
echo "ENVIRONMENT: $ENVIRONMENT"
echo "PG_HOST: $PG_HOST"
echo "PG_USER: $PG_USER"
echo "PG_DATABASE: $PG_DATABASE"
echo "PG_SSLMODE: $PG_SSLMODE"

# Test database connection
echo "🔬 Testing database connection..."
python test_db_connection.py

# Run database migrations
echo "📊 Running database migrations..."
python run_migrations.py

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migrations failed"
    exit 1
fi

# Start the FastAPI server
echo "🌐 Starting FastAPI server..."
exec python -m uvicorn main:app --host 0.0.0.0 --port 8080
