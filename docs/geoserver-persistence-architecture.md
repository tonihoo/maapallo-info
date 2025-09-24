# GeoServer Persistence Architecture Plan

## Problem Statement
GeoServer configuration (workspaces, datastores, layers) is lost on container restarts in Azure Container Apps, breaking the application functionality.

## Solution Overview
Implement a multi-layer persistence strategy that automatically restores GeoServer configuration on startup.

## Architecture Components

### 1. Database-Driven Configuration Storage
Store GeoServer configuration metadata in PostgreSQL tables:

```sql
-- Table to track configured workspaces
CREATE TABLE geoserver_workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table to track configured datastores
CREATE TABLE geoserver_datastores (
    id SERIAL PRIMARY KEY,
    workspace_name VARCHAR(255) REFERENCES geoserver_workspaces(name),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'postgis', 'shapefile', etc.
    connection_params JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(workspace_name, name)
);

-- Table to track configured layers
CREATE TABLE geoserver_layers (
    id SERIAL PRIMARY KEY,
    workspace_name VARCHAR(255) NOT NULL,
    datastore_name VARCHAR(255) NOT NULL,
    layer_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    geom_column VARCHAR(255) DEFAULT 'geom',
    srid INTEGER,
    layer_config JSONB, -- Store layer styling, metadata, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (workspace_name, datastore_name) REFERENCES geoserver_datastores(workspace_name, name),
    UNIQUE(workspace_name, layer_name)
);
```

### 2. Automatic Configuration Restoration
Enhanced startup script that:
- Connects to PostgreSQL on container start
- Reads configuration from database tables
- Recreates workspaces, datastores, and layers via GeoServer REST API
- Validates that all configurations are properly applied

### 3. Configuration Synchronization
Modify the FastAPI admin endpoints to:
- Store configuration in database when creating layers
- Update both GeoServer and database simultaneously
- Provide recovery mechanisms for inconsistent states

### 4. Health Monitoring & Recovery
- Health checks that verify GeoServer configuration integrity
- Automatic recovery triggers when configuration drift is detected
- Logging and monitoring for configuration issues

## Implementation Plan

### Phase 1: Database Schema & Core Infrastructure
1. Create database migration for configuration tables
2. Update FastAPI models to include GeoServer configuration tracking
3. Implement configuration persistence in admin endpoints

### Phase 2: Startup Automation
1. Enhanced initialization script with database-driven config restoration
2. Implement configuration validation and error handling
3. Add comprehensive logging for troubleshooting

### Phase 3: Resilience & Monitoring
1. Configuration drift detection
2. Automatic recovery mechanisms
3. Health monitoring dashboards
4. Backup and restore procedures

### Phase 4: Advanced Features
1. Layer versioning and rollback capabilities
2. Configuration templates for common layer types
3. Bulk import/export functionality
4. Performance optimizations

## Benefits

### Immediate Benefits
- **Zero-downtime recovery**: Automatic restoration after container restarts
- **Consistency**: Database-driven configuration ensures consistency
- **Auditability**: Full history of configuration changes

### Long-term Benefits
- **Scalability**: Easy to add new layer types and configurations
- **Maintainability**: Centralized configuration management
- **Reliability**: Robust error handling and recovery mechanisms
- **Extensibility**: Foundation for advanced GIS features

## Migration Strategy

### Step 1: Implement Database Schema
Add configuration tables to existing PostgreSQL database

### Step 2: Update FastAPI Backend
Modify admin endpoints to persist configuration

### Step 3: Enhanced Startup Scripts
Update GeoServer initialization to read from database

### Step 4: Testing & Validation
Comprehensive testing of restart scenarios

### Step 5: Production Deployment
Gradual rollout with monitoring and rollback capabilities

## Risk Mitigation

### Configuration Corruption
- Database transactions for atomic configuration updates
- Configuration validation before applying changes
- Backup and restore procedures

### Performance Impact
- Lazy loading of configuration data
- Caching mechanisms for frequently accessed configurations
- Database indexing for optimal query performance

### Complexity Management
- Clear separation of concerns between persistence and configuration
- Comprehensive documentation and error messages
- Automated testing for configuration scenarios

## Success Metrics

- **Recovery Time**: < 30 seconds from container start to full functionality
- **Reliability**: 99.9% configuration restoration success rate
- **Maintainability**: Clear audit trail of all configuration changes
- **Performance**: No significant impact on application response times
