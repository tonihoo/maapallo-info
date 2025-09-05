#!/bin/bash

# Test script for GeoServer setup

echo "🧪 Testing GeoServer Setup"
echo "=========================="

# Test 1: Check if services are running
echo "1️⃣  Checking if services are running..."

if curl -s http://localhost:8081/geoserver/web/ > /dev/null; then
    echo "   ✅ GeoServer is running"
else
    echo "   ❌ GeoServer is not accessible"
fi

if curl -s http://localhost:3003/api/v1/health > /dev/null; then
    echo "   ✅ FastAPI backend is running"
else
    echo "   ❌ FastAPI backend is not accessible"
fi

if curl -s http://localhost:8080 > /dev/null; then
    echo "   ✅ Frontend is running"
else
    echo "   ❌ Frontend is not accessible"
fi

# Test 2: Check database connection
echo ""
echo "2️⃣  Testing database connection..."
docker-compose exec -T db psql -U db_dev_user -d db_dev -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Database is accessible"
else
    echo "   ❌ Database connection failed"
fi

# Test 3: Check GeoServer workspace
echo ""
echo "3️⃣  Checking GeoServer workspace..."
response=$(curl -s -u admin:geoserver http://localhost:8081/geoserver/rest/workspaces/maapallo)
if [[ $response == *"maapallo"* ]]; then
    echo "   ✅ Maapallo workspace exists"
else
    echo "   ❌ Maapallo workspace not found"
fi

# Test 4: List available services
echo ""
echo "📋 Service URLs:"
echo "   • Frontend:     http://localhost:8080"
echo "   • FastAPI:      http://localhost:3003"
echo "   • GeoServer:    http://localhost:8081/geoserver"
echo "   • PgAdmin:      http://localhost:5050"
echo "   • Database:     localhost:5432"
echo ""
echo "🔐 Default Credentials:"
echo "   • GeoServer:    admin / geoserver"
echo "   • PgAdmin:      admin@example.com / admin"
echo "   • Database:     db_dev_user / DevPassword"
