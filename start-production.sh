#!/bin/bash

# Production startup script for FastAPI + GeoServer
# This script starts both services using a simple approach

set -e

echo "🚀 Starting Maapallo.info with GeoServer..."

# Set GeoServer environment variables
export GEOSERVER_DATA_DIR="/opt/geoserver/data_dir"
export CATALINA_HOME="/opt/tomcat"
export CATALINA_BASE="/opt/tomcat"
export JAVA_OPTS="-Xms256m -Xmx1024m -XX:+UseParallelGC -Dfile.encoding=UTF8 -Duser.timezone=GMT -Djava.awt.headless=true -Dgeoserver.data.dir=/opt/geoserver/data_dir"

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
echo "🔍 Checking GeoServer deployment..."
ls -la /opt/tomcat/webapps/
echo "🔍 Checking if geoserver directory exists:"
ls -la /opt/tomcat/webapps/geoserver/ 2>/dev/null || echo "❌ No geoserver directory found"

cd /opt/tomcat
./bin/catalina.sh start

# ZERO-WAIT STRATEGY: Start FastAPI immediately without waiting for GeoServer
# This ensures Azure gets a response within the 230s limit
echo "⚡ Zero-wait strategy: Starting FastAPI immediately..."
echo "🗺️  GeoServer will initialize in background..."

# Skip GeoServer wait completely for Azure startup compliance

# Run database migrations with timeout (don't let this block FastAPI startup)
echo "🗃️  Attempting database migrations (with timeout)..."
cd /app

# Try migrations but don't fail if they timeout or fail
# Use timeout to prevent migrations from blocking FastAPI startup
timeout 30 python migrate.py || echo "⚠️  Migration timeout/failed - continuing with FastAPI startup"

# Start FastAPI application immediately
echo "🐍 Starting FastAPI application..."
exec python -m uvicorn main:app --host 0.0.0.0 --port 8080
