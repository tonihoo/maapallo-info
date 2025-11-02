# Fix Database Connection for Map Layer Upload

## Problem
When uploading map layers, the application tries to connect to `maapallo-db-server.postgres.database.azure.com`, which doesn't exist or isn't reachable.

## Solution Applied

✅ **Code Fix**: Updated `/server/routes/admin.py` to allow environment variables to override the hardcoded database hostname in production.

## Steps to Fix in Production

### Step 1: Find Your Actual Database Server Name

Run this command to list your PostgreSQL servers:

```bash
az postgres flexible-server list \
  --resource-group maapallo-info-group \
  --query "[].{Name:name, FullHost:fullyQualifiedDomainName, State:state}" \
  -o table
```

**OR** check in the Azure Portal:
1. Go to https://portal.azure.com
2. Navigate to Resource Group: `maapallo-info-group`
3. Look for "Azure Database for PostgreSQL flexible servers"
4. Note the server name (e.g., `maapallo-db-server-v2` or similar)

### Step 2: Set Environment Variables in Azure Container App

Once you know your database server name, update the container app:

```bash
# Replace with your actual values
DB_SERVER_NAME="maapallo-db-server-v2"  # or whatever your actual server name is
DB_NAME="maapallo_info"  # your database name
DB_USER="maapalloadmin"  # your admin user

# Update the container app environment variables
az containerapp update \
  --name maapallo-server \
  --resource-group maapallo-info-group \
  --set-env-vars \
    "POSTGRES_HOST=${DB_SERVER_NAME}.postgres.database.azure.com" \
    "POSTGRES_DB=${DB_NAME}" \
    "POSTGRES_USER=${DB_USER}" \
    "POSTGRES_PORT=5432" \
    "POSTGRES_SSLMODE=require"
```

**Note**: You'll also need to set `POSTGRES_PASSWORD` - either add it to the command above or set it separately as a secret.

### Step 3: Set Database Password Securely

The password should already be set, but if needed:

```bash
# Set as a secret in GitHub (if using GitHub Actions)
gh secret set POSTGRES_PASSWORD --body "your-db-password"

# Or set directly in Azure Container App
az containerapp update \
  --name maapallo-server \
  --resource-group maapallo-info-group \
  --set-env-vars "POSTGRES_PASSWORD=your-db-password"
```

### Step 4: Deploy the Code Fix

Commit and push the updated `server/routes/admin.py`:

```bash
git add server/routes/admin.py
git commit -m "Fix: Allow POSTGRES_HOST environment variable to override hardcoded hostname"
git push origin main
```

This will trigger your deployment pipeline to deploy the updated code.

### Step 5: Verify the Fix

After deployment, test uploading a map layer:

1. Log into the admin panel
2. Try uploading a GeoJSON file
3. The upload should now succeed

## Alternative Quick Fix (If You Don't Want to Deploy Code)

If you need an immediate fix without deploying code changes, you can:

1. **Check what database server exists**: Look in Azure Portal
2. **If it's named differently**: Create a DNS alias or update the server name
3. **Temporary workaround**: Set `ENVIRONMENT` to something other than "production" (e.g., "staging") so it uses the environment variables instead of the hardcoded hostname

## Checking Current Environment Variables

To see what's currently set:

```bash
az containerapp show \
  --name maapallo-server \
  --resource-group maapallo-info-group \
  --query "properties.template.containers[0].env[?name=='POSTGRES_HOST' || name=='POSTGRES_DB' || name=='POSTGRES_USER' || name=='ENVIRONMENT'].{Name:name, Value:value}" \
  -o table
```

## What Changed in the Code

**Before** (hardcoded, couldn't be overridden):
```python
if os.getenv("ENVIRONMENT") == "production":
    host = "maapallo-db-server.postgres.database.azure.com"
```

**After** (respects environment variables):
```python
if os.getenv("ENVIRONMENT") == "production":
    host = (
        os.getenv("POSTGRES_HOST")
        or os.getenv("pg_host")
        or "maapallo-db-server.postgres.database.azure.com"
    )
```

Now the `POSTGRES_HOST` environment variable will be used if set, falling back to the default only if not specified.

## Troubleshooting

### If you still get connection errors:

1. **Check the server exists**:
   ```bash
   nslookup YOUR-SERVER-NAME.postgres.database.azure.com
   ```

2. **Check firewall rules**: Ensure the container app can reach the database
   ```bash
   az postgres flexible-server firewall-rule list \
     --resource-group maapallo-info-group \
     --name YOUR-SERVER-NAME -o table
   ```

3. **Check logs**:
   ```bash
   az containerapp logs show \
     --name maapallo-server \
     --resource-group maapallo-info-group \
     --tail 50
   ```

4. **Test database connectivity**: Use the `/api/v1/admin/db-ping` endpoint (requires admin login)

## Notes

- The database password is also checked via `POSTGRES_PASSWORD` or `DB_ADMIN_PASSWORD` environment variables
- SSL mode defaults to "require" in production
- The fix maintains backward compatibility with the old default if no environment variables are set

