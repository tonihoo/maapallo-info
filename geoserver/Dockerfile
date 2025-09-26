# GeoServer Docker Configuration for Maapallo GIS
FROM kartoza/geoserver:2.24.0

# Base (non-secret) env. Real secrets come from deployment.
ENV GEOSERVER_DATA_DIR=/opt/geoserver/data_dir \
    GEOSERVER_CSRF_DISABLED=true \
    GEOSERVER_CSRF_WHITELIST=localhost:8080,127.0.0.1:8080 \
    JAVA_OPTS="-Xms512m -Xmx1024m -DGEOSERVER_CSRF_DISABLED=true -Dorg.geotools.referencing.forceXY=true"

USER root

# Install tools (single layer)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gdal-bin \
    postgresql-client \
    curl \
    jq \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create uploads dir
RUN mkdir -p /opt/geoserver/uploads

# Copy scripts once
COPY scripts/import-data.sh /usr/local/bin/import-data.sh
COPY scripts/00-proxy-base.sh /docker-entrypoint-geoserver.d/00-proxy-base.sh
COPY scripts/init-geoserver.sh /docker-entrypoint-geoserver.d/init-geoserver.sh
COPY scripts/restore-config.sh /docker-entrypoint-geoserver.d/10-restore-config.sh

# Permissions + data dir (guard chown if user exists)
RUN chmod +x /usr/local/bin/import-data.sh && \
    chmod +x /docker-entrypoint-geoserver.d/*.sh && \
    mkdir -p /opt/geoserver/data_dir && \
    if id -u geoserver >/dev/null 2>&1; then \
    chown -R geoserver:geoserver /opt/geoserver/data_dir /usr/local/bin/import-data.sh /docker-entrypoint-geoserver.d; \
    else \
    echo "geoserver user not found in base image; skipping chown"; \
    fi

# Do not bake credentials; they are injected at deploy time:
# GEOSERVER_ADMIN_USER / GEOSERVER_ADMIN_PASSWORD / POSTGRES_* / PROXY_BASE_URL

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:8080/geoserver/web/ || exit 1
