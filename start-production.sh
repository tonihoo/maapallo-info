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

# Wait for GeoServer to be fully ready
echo "⏳ Waiting for GeoServer to initialize..."
max_attempts=6  # 1 minute total (6 * 10 seconds) 
attempt=0
while [ $attempt -lt $max_attempts ]; do
    sleep 10
    attempt=$((attempt + 1))

    # Debug: Check what's deployed (only first few attempts to reduce noise)
    if [ $attempt -le 2 ]; then
        echo "🔍 Deployed webapps:"
        ls -la /opt/tomcat/webapps/
    fi

    # Check if GeoServer web interface is responding
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/geoserver/web/ | grep -q "302\|200"; then
        echo "✅ GeoServer is ready!"
        break
    elif curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/geoserver/ | grep -q "302\|200"; then
        echo "✅ GeoServer is ready!"
        break
    else
        echo "⏳ GeoServer not ready yet... (attempt $attempt/$max_attempts)"
        # Show Tomcat logs for debugging on later attempts
        if [ $attempt -gt 3 ] && [ -f "/opt/tomcat/logs/catalina.out" ]; then
            echo "📋 Last 2 lines of Tomcat log:"
            tail -2 /opt/tomcat/logs/catalina.out
        fi
        if [ $attempt -eq $max_attempts ]; then
            echo "⚠️  GeoServer startup timeout, continuing with FastAPI anyway..."
            echo "📋 Final Tomcat log check:"
            if [ -f "/opt/tomcat/logs/catalina.out" ]; then
                tail -5 /opt/tomcat/logs/catalina.out
            fi
        fi
    fi
done

# Run database migrations for FastAPI
echo "🗃️  Running database migrations..."
cd /app
python migrate.py

# Start FastAPI application
echo "🐍 Starting FastAPI application..."
exec python -m uvicorn main:app --host 0.0.0.0 --port 8080
