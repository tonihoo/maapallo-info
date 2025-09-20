#!/bin/sh
set -eu

: "${BASIC_AUTH_USERNAME:=earth}"
: "${BASIC_AUTH_PASSWORD:=isnotflat}"

# If both vars are provided, generate htpasswd file; otherwise warn and disable auth by creating an empty file
HTPASSWD_FILE="/etc/nginx/.htpasswd"
mkdir -p "$(dirname "$HTPASSWD_FILE")"

# Generate APR1 hash using openssl (portable on alpine)
HASH=$(openssl passwd -apr1 "$BASIC_AUTH_PASSWORD")
echo "${BASIC_AUTH_USERNAME}:${HASH}" > "$HTPASSWD_FILE"
echo "[entrypoint] Basic Auth configured for user '$BASIC_AUTH_USERNAME'"

exec nginx -g 'daemon off;'
