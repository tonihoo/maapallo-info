#!/bin/bash
set -e

echo "🔄 Starting application startup..."

# Navigate to server directory
cd /home/site/wwwroot/server

# Run database migrations
echo "🗄️  Running database migrations..."
python run_migrations.py

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migrations failed"
    exit 1
fi

# Start the FastAPI server
echo "🚀 Starting FastAPI server..."
cd /home/site/wwwroot
exec python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
