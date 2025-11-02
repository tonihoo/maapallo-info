#!/bin/bash
set -e

echo "=========================================="
echo "Fix Database Connection for Map Uploads"
echo "=========================================="
echo ""

RESOURCE_GROUP="maapallo-info-group"

echo "Step 1: Finding your PostgreSQL servers..."
echo ""

# Try to list servers
echo "Running: az postgres flexible-server list --resource-group $RESOURCE_GROUP"
SERVERS=$(az postgres flexible-server list \
  --resource-group $RESOURCE_GROUP \
  --query "[].name" \
  -o tsv 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Azure CLI error. Please run this command manually:"
  echo "   az postgres flexible-server list --resource-group $RESOURCE_GROUP -o table"
  echo ""
  echo "Or check in Azure Portal:"
  echo "   https://portal.azure.com → Resource Groups → $RESOURCE_GROUP → PostgreSQL servers"
  echo ""
  read -p "Enter your database server name (without .postgres.database.azure.com): " SERVER_NAME
else
  echo "Found servers:"
  echo "$SERVERS" | sed 's/^/  - /'
  echo ""

  # Count servers
  SERVER_COUNT=$(echo "$SERVERS" | wc -l)

  if [ "$SERVER_COUNT" -eq 1 ]; then
    SERVER_NAME=$(echo "$SERVERS" | tr -d '[:space:]')
    echo "Using server: $SERVER_NAME"
  else
    echo "Multiple servers found. Which one should we use?"
    PS3="Select server number: "
    select SERVER_NAME in $SERVERS; do
      if [ -n "$SERVER_NAME" ]; then
        break
      fi
    done
  fi
fi

echo ""
echo "Selected server: $SERVER_NAME"
FULL_HOST="${SERVER_NAME}.postgres.database.azure.com"
echo "Full hostname: $FULL_HOST"
echo ""

# Get database name
echo "Step 2: Getting database name..."
DB_LIST=$(az postgres flexible-server db list \
  --server-name $SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?name!='azure_maintenance' && name!='azure_sys' && name!='postgres'].name" \
  -o tsv 2>&1)

if [ $? -eq 0 ]; then
  echo "Found databases:"
  echo "$DB_LIST" | sed 's/^/  - /'
  echo ""

  # Prefer maapallo_info if it exists, otherwise use first non-default DB
  if echo "$DB_LIST" | grep -q "maapallo_info"; then
    DB_NAME="maapallo_info"
    echo "Using database: $DB_NAME (auto-selected)"
  elif echo "$DB_LIST" | grep -qv "flexibleserverdb"; then
    # Skip flexibleserverdb (Azure default) and use first actual database
    DB_NAME=$(echo "$DB_LIST" | grep -v "flexibleserverdb" | head -n 1 | tr -d '[:space:]')
    echo "Using database: $DB_NAME"
  else
    DB_NAME=$(echo "$DB_LIST" | head -n 1 | tr -d '[:space:]')
    echo "Using database: $DB_NAME"
  fi
else
  read -p "Enter your database name: " DB_NAME
fi

echo ""

# Get database user
read -p "Enter database admin username [maapalloadmin]: " DB_USER
DB_USER=${DB_USER:-maapalloadmin}

echo ""
echo "=========================================="
echo "Configuration Summary"
echo "=========================================="
echo "POSTGRES_HOST: $FULL_HOST"
echo "POSTGRES_DB: $DB_NAME"
echo "POSTGRES_USER: $DB_USER"
echo "POSTGRES_PORT: 5432"
echo "POSTGRES_SSLMODE: require"
echo ""

read -p "Do you want to update the container app with these settings? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "Note: This will NOT set the password. Set it separately using:"
  echo "  az containerapp update --name maapallo-server --resource-group $RESOURCE_GROUP --set-env-vars \"POSTGRES_PASSWORD=your-password\""
  echo ""
  read -p "Continue? (y/n) " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Updating container app..."
    az containerapp update \
      --name maapallo-server \
      --resource-group $RESOURCE_GROUP \
      --set-env-vars \
        "POSTGRES_HOST=$FULL_HOST" \
        "POSTGRES_DB=$DB_NAME" \
        "POSTGRES_USER=$DB_USER" \
        "POSTGRES_PORT=5432" \
        "POSTGRES_SSLMODE=require"

    echo ""
    echo "✅ Container app updated!"
    echo ""
    echo "⚠️  Don't forget to set POSTGRES_PASSWORD:"
    echo "  az containerapp update --name maapallo-server --resource-group $RESOURCE_GROUP --set-env-vars \"POSTGRES_PASSWORD=your-password\""
  fi
else
  echo ""
  echo "Skipped update. Run this command manually:"
  echo ""
  echo "az containerapp update \\"
  echo "  --name maapallo-server \\"
  echo "  --resource-group $RESOURCE_GROUP \\"
  echo "  --set-env-vars \\"
  echo "    \"POSTGRES_HOST=$FULL_HOST\" \\"
  echo "    \"POSTGRES_DB=$DB_NAME\" \\"
  echo "    \"POSTGRES_USER=$DB_USER\" \\"
  echo "    \"POSTGRES_PORT=5432\" \\"
  echo "    \"POSTGRES_SSLMODE=require\" \\"
  echo "    \"POSTGRES_PASSWORD=your-password\""
fi

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo "1. Set POSTGRES_PASSWORD in Azure Container App"
echo "2. Commit and push the code changes:"
echo "   git add server/routes/admin.py"
echo "   git commit -m 'Fix: Allow POSTGRES_HOST override for database connection'"
echo "   git push origin main"
echo "3. Wait for deployment to complete"
echo "4. Test map layer upload in admin panel"
echo ""
echo "For more details, see: FIX_DATABASE_CONNECTION.md"

