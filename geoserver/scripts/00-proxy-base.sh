#!/bin/bash
# Early script to inject proxy base URL into GeoServer JVM options.
# Runs before other entrypoint scripts (name ordered).
set -euo pipefail

log() { echo "[proxy-base][$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }

if [[ -n "${PROXY_BASE_URL:-}" ]]; then
  log "Setting org.geoserver.proxyBaseURL=${PROXY_BASE_URL}"
  export JAVA_OPTS="${JAVA_OPTS:-} -Dorg.geoserver.proxyBaseURL=${PROXY_BASE_URL} -DGEOSERVER_ACCEPT_PROXY_HEADERS=true"
else
  log "PROXY_BASE_URL not set – leaving proxyBaseURL unchanged"
fi

exit 0
