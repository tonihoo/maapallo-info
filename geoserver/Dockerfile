# GeoServer Docker Configuration for Maapallo GIS
FROM kartoza/geoserver:2.24.0

# Base (non-secret) environment defaults. Secrets (admin password, DB creds) are provided at runtime via deployment.
ENV GEOSERVER_DATA_DIR=/opt/geoserver/data_dir
ENV GEOSERVER_CSRF_DISABLED=true
ENV GEOSERVER_CSRF_WHITELIST=localhost:8080,127.0.0.1:8080

# Do NOT bake credentials in the image. Expect runtime env vars:
#   GEOSERVER_ADMIN_USER (default: admin if omitted)
#   GEOSERVER_ADMIN_PASSWORD
#   POSTGRES_HOST / POSTGRES_PORT / POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD
#   PROXY_BASE_URL

# Performance optimizations and proxy configuration
ENV JAVA_OPTS="-Xms512m -Xmx1024m -DGEOSERVER_CSRF_DISABLED=true -Dorg.geotools.referencing.forceXY=true"

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

# Copy scripts and configuration files (as root)
COPY scripts/import-data.sh /usr/local/bin/import-data.sh
COPY scripts/init-geoserver.sh /docker-entrypoint-geoserver.d/init-geoserver.sh
COPY scripts/00-proxy-base.sh /docker-entrypoint-geoserver.d/00-proxy-base.sh
COPY scripts/restore-config.sh /docker-entrypoint-geoserver.d/10-restore-config.sh

# Install additional packages as root
RUN apt-get update && \
    apt-get install -y postgresql-client curl jq && \
    rm -rf /var/lib/apt/lists/*

# Make scripts executable (as root, before switching user)
RUN chmod +x /usr/local/bin/import-data.sh \
    && chmod +x /docker-entrypoint-geoserver.d/init-geoserver.sh \
    && chmod +x /docker-entrypoint-geoserver.d/00-proxy-base.sh \
    && chmod +x /docker-entrypoint-geoserver.d/10-restore-config.sh

# Ensure proper ownership of GeoServer directories
RUN mkdir -p /opt/geoserver/data_dir && \
    chown -R geoserver:geoserver /opt/geoserver/data_dir

# Switch to geoserver user only at the end
USER geoserver

# Copy restore configuration script
COPY scripts/restore-config.sh /docker-entrypoint-geoserver.d/10-restore-config.sh
RUN chmod +x /docker-entrypoint-geoserver.d/10-restore-config.sh

# Don't switch back to user - let the base image handle it

# Expose GeoServer port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/geoserver/web/ || exit 1
