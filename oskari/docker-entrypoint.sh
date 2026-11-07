#!/bin/bash
set -euo pipefail

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-oskaridb}"
DB_USER="${DB_USER:-oskari}"
DB_PASSWORD="${DB_PASSWORD:-oskari}"
OSKARI_DOMAIN="${OSKARI_DOMAIN:-http://localhost:8080}"
OSKARI_SECURE="${OSKARI_SECURE:-false}"

if ! [[ "$DB_HOST" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid DB_HOST" >&2
  exit 1
fi
if ! [[ "$DB_PORT" =~ ^[0-9]+$ ]]; then
  echo "Invalid DB_PORT" >&2
  exit 1
fi
if ! [[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "Invalid DB_NAME" >&2
  exit 1
fi
if ! [[ "$DB_USER" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "Invalid DB_USER" >&2
  exit 1
fi

sql_escape() {
  printf '%s' "$1" | sed "s/'/''/g"
}

sed_escape() {
  printf '%s' "$1" | sed -e 's/[\\|&]/\\&/g'
}

# Azure Database for PostgreSQL rejects non-SSL clients. The JDBC driver
# defaults to sslmode=disable, unlike psql which prefers SSL.
DB_SSLMODE="${DB_SSLMODE:-}"
if [ -z "$DB_SSLMODE" ] && [[ "$DB_HOST" == *.postgres.database.azure.com ]]; then
  DB_SSLMODE=require
fi
case "$DB_SSLMODE" in
  ""|disable|allow|prefer|require|verify-ca|verify-full) ;;
  *)
    echo "Invalid DB_SSLMODE" >&2
    exit 1
    ;;
esac
JDBC_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"
if [ -n "$DB_SSLMODE" ]; then
  JDBC_URL="${JDBC_URL}?sslmode=${DB_SSLMODE}"
fi

PROPS=/usr/local/tomcat/lib/oskari-ext.properties
sed -i "s|^db.url=.*|db.url=$(sed_escape "$JDBC_URL")|" "$PROPS"
sed -i "s|^db.username=.*|db.username=${DB_USER}|" "$PROPS"
sed -i "s|^db.password=.*|db.password=$(sed_escape "$DB_PASSWORD")|" "$PROPS"
sed -i "s|^oskari.domain=.*|oskari.domain=$(sed_escape "$OSKARI_DOMAIN")|" "$PROPS"

if [ "$OSKARI_SECURE" = "true" ]; then
  sed -i 's/scheme="http" secure="false"/scheme="https" secure="true"/' /usr/local/tomcat/conf/server.xml
fi

# Nginx owns the published port. Tomcat stays on the loopback port behind it.
sed -i 's/<Connector port="8080"/<Connector port="8081"/' /usr/local/tomcat/conf/server.xml

if [ -n "${BASIC_AUTH_USERNAME:-}" ] && [ -n "${BASIC_AUTH_PASSWORD:-}" ]; then
  HASH=$(openssl passwd -apr1 "$BASIC_AUTH_PASSWORD")
  printf '%s:%s\n' "$BASIC_AUTH_USERNAME" "$HASH" > /etc/nginx/.htpasswd
  echo "Basic auth enabled for user ${BASIC_AUTH_USERNAME}"
  sed 's|#AUTH#|auth_basic "Restricted";\n    auth_basic_user_file /etc/nginx/.htpasswd;|' /opt/nginx.conf.template > /etc/nginx/conf.d/default.conf
else
  sed 's|#AUTH#||' /opt/nginx.conf.template > /etc/nginx/conf.d/default.conf
fi
rm -f /etc/nginx/sites-enabled/default

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}"
ready=0
for _ in $(seq 1 60); do
  if timeout 2 bash -c "echo >/dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" != "1" ]; then
  echo "PostgreSQL did not become reachable" >&2
  exit 1
fi

if [ -n "${POSTGRES_SUPERUSER:-}" ]; then
  export PGPASSWORD="${POSTGRES_SUPERPASSWORD:-}"
  USER_SQL=$(sql_escape "$DB_USER")
  PASS_SQL=$(sql_escape "$DB_PASSWORD")
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_SUPERUSER" -d postgres -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${USER_SQL}') THEN
    CREATE ROLE ${USER_SQL} LOGIN PASSWORD '${PASS_SQL}';
  END IF;
END
\$\$;
SQL
  EXISTS_DB=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_SUPERUSER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")
  if [ "$EXISTS_DB" != "1" ]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_SUPERUSER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}"
  fi
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_SUPERUSER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<SQL
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
GRANT ALL ON SCHEMA public TO ${DB_USER};
SQL
  unset PGPASSWORD
fi

redis-server --daemonize yes --bind 127.0.0.1 --port 6379 --protected-mode yes --save "" --appendonly no --dir /tmp --logfile /tmp/redis.log
nginx

cd /usr/local/tomcat
mkdir -p logs temp work
export JAVA_OPTS="${JAVA_OPTS:--Xms512m -Xmx1536m -Djava.awt.headless=true -Djava.io.tmpdir=/usr/local/tomcat/temp}"

exec catalina.sh run
