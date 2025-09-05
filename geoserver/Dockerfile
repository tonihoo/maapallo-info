# GeoServer Docker Configuration for Maapallo GIS
FROM kartoza/geoserver:2.24.0

# Set environment variables for GeoServer
ENV GEOSERVER_ADMIN_USER=admin
ENV GEOSERVER_ADMIN_PASSWORD=geoserver
ENV GEOSERVER_DATA_DIR=/opt/geoserver/data_dir
ENV POSTGRES_HOST=db
ENV POSTGRES_PORT=5432
ENV POSTGRES_DB=db_dev
ENV POSTGRES_USER=db_dev_user
ENV POSTGRES_PASS=DevPassword

# Enable CORS for web client access
ENV GEOSERVER_CSRF_DISABLED=true
ENV GEOSERVER_CSRF_WHITELIST=localhost:8080,127.0.0.1:8080

# Performance optimizations for development
ENV JAVA_OPTS="-Xms512m -Xmx1024m -DGEOSERVER_CSRF_DISABLED=true"

# Install additional tools as root, then copy our scripts
USER root

# Install GDAL and PostgreSQL client
RUN apt-get update && \
    apt-get install -y \
    gdal-bin \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create uploads directory
RUN mkdir -p /opt/geoserver/uploads

# Copy our scripts
COPY scripts/import-data.sh /usr/local/bin/import-data.sh
COPY scripts/init-geoserver.sh /docker-entrypoint-geoserver.d/init-geoserver.sh

# Make scripts executable
RUN chmod +x /usr/local/bin/import-data.sh \
    && chmod +x /docker-entrypoint-geoserver.d/init-geoserver.sh

# Don't switch back to user - let the base image handle it

# Expose GeoServer port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/geoserver/web/ || exit 1
