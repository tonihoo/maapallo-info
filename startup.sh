#!/bin/bash
set -e

echo "🚀 Starting application startup..."

# Navigate to the application directory (Docker WORKDIR is /app)
cd /app

echo "🔄 Running database migrations..."
python run_migrations.py

echo "🌐 Starting FastAPI server..."
python -m uvicorn main:app --host 0.0.0.0 --port 8080
