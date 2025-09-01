#!/bin/bash
set -e

echo "🔄 Starting application startup..."

# Navigate to application directory (mapped to /home/site/wwwroot in Azure)
cd /home/site/wwwroot

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
exec python -m uvicorn main:app --host 0.0.0.0 --port 8080
