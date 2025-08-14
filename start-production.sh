#!/bin/bash

# Production startup script for FastAPI + GeoServer
# This script starts both services using a simple approach

set -e

echo "🚀 Starting Maapallo.info with GeoServer..."

# Set GeoServer environment variables
export GEOSERVER_DATA_DIR="/opt/geoserver/data_dir"
export CATALINA_HOME="/opt/tomcat"
export CATALINA_BASE="/opt/tomcat"
export JAVA_OPTS="-Xms512m -Xmx1g -XX:+UseParallelGC -Dfile.encoding=UTF8 -Duser.timezone=GMT -Djava.awt.headless=true"

# Configure Tomcat to run on port 8081 instead of 8080
sed -i 's/port="8080"/port="8081"/g' /opt/tomcat/conf/server.xml

# Initialize GeoServer data directory if it doesn't exist
if [ ! -f "/opt/geoserver/data_dir/global.xml" ]; then
    echo "📁 Initializing GeoServer data directory..."
    mkdir -p /opt/geoserver/data_dir
    if [ -d "/opt/geoserver/data" ]; then
        cp -r /opt/geoserver/data/* /opt/geoserver/data_dir/
    fi
    chown -R 1000:1000 /opt/geoserver/data_dir
fi

# Start GeoServer (Tomcat) in the background
echo "🗺️  Starting GeoServer..."

# Debug: Check if geoserver.war exists
echo "🔍 Checking GeoServer WAR file..."
ls -la /opt/tomcat/webapps/

cd /opt/tomcat
./bin/catalina.sh start

# Wait for GeoServer to be fully ready
echo "⏳ Waiting for GeoServer to initialize..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    sleep 10
    attempt=$((attempt + 1))

    # Debug: Check what's deployed
    echo "🔍 Deployed webapps:"
    ls -la /opt/tomcat/webapps/

    # Check if GeoServer web interface is responding
    if curl -sf http://localhost:8081/geoserver/web/ > /dev/null 2>&1; then
        echo "✅ GeoServer is ready!"
        break
    elif curl -sf http://localhost:8081/geoserver/ > /dev/null 2>&1; then
        echo "✅ GeoServer is ready!"
        break
    else
        echo "⏳ GeoServer not ready yet... (attempt $attempt/$max_attempts)"
        # Show Tomcat logs for debugging
        if [ -f "/opt/tomcat/logs/catalina.out" ]; then
            echo "📋 Last 5 lines of Tomcat log:"
            tail -5 /opt/tomcat/logs/catalina.out
        fi
        if [ $attempt -eq $max_attempts ]; then
            echo "⚠️  GeoServer startup timeout, but continuing with FastAPI..."
        fi
    fi
done# Run database migrations for FastAPI
echo "🗃️  Running database migrations..."
cd /app
python migrate.py

# Start FastAPI application
echo "🐍 Starting FastAPI application..."
exec python -m uvicorn main:app --host 0.0.0.0 --port 8080
