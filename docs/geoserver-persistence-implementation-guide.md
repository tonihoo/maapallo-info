# GeoServer Configuration Persistence - Implementation Guide

## Overview
This implementation adds database-backed persistence for GeoServer configuration to prevent configuration loss on container restarts.

## Database Migration

### Apply the Migration
The database schema for GeoServer configuration persistence needs to be applied to your PostgreSQL database:

```bash
# Connect to your database and run the migration file
psql -h your-host -p 5432 -U your-user -d your-database -f server/migrations/0005_geoserver_persistence.sql
```

### For Azure Database for PostgreSQL:
```bash
psql "host=maapallo-db-server.postgres.database.azure.com port=5432 dbname=postgres user=your-user sslmode=require" -f server/migrations/0005_geoserver_persistence.sql
```

## GeoServer Container Updates

### Update Dockerfile
The GeoServer container needs to be updated to use the new restoration script:

```dockerfile
# Add to geoserver/Dockerfile
COPY scripts/restore-config.sh /usr/local/bin/restore-config.sh
RUN chmod +x /usr/local/bin/restore-config.sh

# Set the restore script to run on startup
ENV GEOSERVER_STARTUP_SCRIPT="/usr/local/bin/restore-config.sh"
```

### Environment Variables
Add these environment variables to your GeoServer container configuration:

```yaml
# In docker-compose.yml or Azure Container Apps
environment:
  - POSTGRES_HOST=your-postgres-host
  - POSTGRES_PORT=5432
  - POSTGRES_DB=your-database
  - POSTGRES_USER=your-user
  - POSTGRES_PASSWORD=your-password
  - POSTGRES_SSLMODE=require  # for Azure PostgreSQL
  - GEOSERVER_ADMIN_USER=admin
  - GEOSERVER_ADMIN_PASSWORD=your-geoserver-password
```

## API Integration

### New Endpoints
The implementation adds new REST API endpoints for GeoServer configuration management:

- `POST /api/v1/admin/geoserver/setup-default` - Set up default configuration
- `POST /api/v1/admin/geoserver/workspaces` - Register workspace
- `POST /api/v1/admin/geoserver/datastores` - Register datastore
- `POST /api/v1/admin/geoserver/layers` - Register layer
- `GET /api/v1/admin/geoserver/configuration` - Get full configuration
- `GET /api/v1/admin/geoserver/layers` - Get registered layers
- `POST /api/v1/admin/geoserver/layers/auto-register` - Auto-register layer from table
- `GET /api/v1/admin/geoserver/tables/available` - Get available tables

### Updated Admin Import Process
The existing admin import process now automatically registers layers in the persistence database:

```python
# When a layer is created via the admin API, it's now automatically
# registered in the persistence database for restoration on restart
```

## Testing the Implementation

### 1. Apply Database Migration
```bash
# Apply the SQL migration to create the configuration tables
psql -f server/migrations/0005_geoserver_persistence.sql
```

### 2. Update FastAPI Server
```bash
# Restart the server to load the new API endpoints
cd server
python3 -m uvicorn main:app --reload
```

### 3. Set Up Default Configuration
```bash
# Call the setup endpoint to create default workspace and datastore
curl -X POST "http://localhost:8000/api/v1/admin/geoserver/setup-default" \
  -H "Authorization: Bearer your-jwt-token"
```

### 4. Test Layer Registration
```bash
# Auto-register a layer from an existing table
curl -X POST "http://localhost:8000/api/v1/admin/geoserver/layers/auto-register" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"table_name": "your_spatial_table"}'
```

### 5. Restart GeoServer Container
After updating the GeoServer container with the restore script and restarting it:
- Check GeoServer UI to verify workspaces, datastores, and layers are restored
- The restore-config.sh script should run automatically on container startup

## Deployment Checklist

- [ ] Apply database migration (001_geoserver_persistence.sql)
- [ ] Update GeoServer Dockerfile to include restore-config.sh
- [ ] Add environment variables for database connection
- [ ] Deploy updated FastAPI server with new endpoints
- [ ] Deploy updated GeoServer container
- [ ] Test configuration restoration after container restart
- [ ] Verify existing layers are accessible in client application

## Monitoring

The implementation includes comprehensive logging:
- Database operations are logged with success/failure status
- GeoServer API calls are logged for debugging
- Configuration restoration process is logged during container startup

Check logs to monitor the health of the persistence system:
```bash
# FastAPI server logs
docker logs your-server-container

# GeoServer container logs
docker logs your-geoserver-container
```

## Rollback Plan

If issues occur, you can rollback by:
1. Reverting to the previous container images
2. The persistence tables don't interfere with existing functionality
3. Remove new API endpoints by commenting out the router inclusion in main.py

The implementation is designed to be non-disruptive to existing functionality.
