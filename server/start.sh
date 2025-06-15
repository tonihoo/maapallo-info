#!/bin/sh

# Production startup script for maapallo.info
# This script runs database migrations before starting the FastAPI server

echo "🚀 Starting maapallo.info production server..."

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
