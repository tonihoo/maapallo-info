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
cd /opt/tomcat
./bin/catalina.sh start

# Wait a moment for GeoServer to initialize
sleep 10

# Run database migrations for FastAPI
echo "🗃️  Running database migrations..."
cd /app
python migrate.py

# Start FastAPI application
echo "🐍 Starting FastAPI application..."
exec python -m uvicorn main:app --host 0.0.0.0 --port 8080
