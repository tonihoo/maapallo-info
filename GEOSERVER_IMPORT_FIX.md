# GeoServer Import Error Fix

## Problem

After deploying the cost optimization changes, the admin panel's GeoServer import functionality was failing with:
```
POST https://maapallo.info/api/v1/admin/geoserver-import 500 (Internal Server Error)
GeoServer import error: Error: Import failed: {"detail":"Failed to create layer: "}
```

## Root Cause

The server container was missing critical database connection environment variables. Specifically:
- `POSTGRES_HOST` was not set in the deployment workflow
- The server code defaults to `maapallo-db-server.postgres.database.azure.com` in production mode when `POSTGRES_HOST` is not set
- However, the actual database server name is `maapallo-db-server-v2.postgres.database.azure.com` (as set in `DB_SERVER_NAME`)

### What Was Happening

1. User uploads a GeoJSON file through the admin panel
2. Server imports the data into PostGIS successfully (using the DB_NAME, DB_ADMIN_USER, DB_ADMIN_PASSWORD env vars which were set)
3. Server tries to create a GeoServer datastore pointing to PostGIS
4. Server uses `_resolve_geoserver_db_params()` to get database connection parameters
5. This function calls `_resolve_db_params()` which in production mode defaults to the OLD database server name
6. GeoServer datastore creation fails because it's pointing to the wrong database server
7. Layer creation fails with an empty error message

### Code Reference

In `server/routes/admin.py` lines 456-521, the `_resolve_db_params()` function:

```python
def _resolve_db_params() -> dict:
    """Resolve DB connection parameters from env or settings."""
    if os.getenv("ENVIRONMENT") == "production":
        host = (
            os.getenv("POSTGRES_HOST")           # ❌ Not set
            or os.getenv("pg_host")              # ❌ Not set
            or "maapallo-db-server.postgres.database.azure.com"  # ❌ OLD SERVER!
        )
```

## Solution

Updated `.github/workflows/azure-deploy.yml` to include the correct database connection environment variables in all three places where the server container is created or updated:

### Added Environment Variables

```yaml
"POSTGRES_HOST=${{ env.DB_SERVER_NAME }}.postgres.database.azure.com"
"POSTGRES_PORT=5432"
"POSTGRES_DB=${{ secrets.DB_NAME }}"
"POSTGRES_USER=${{ secrets.DB_ADMIN_USER }}"
"POSTGRES_PASSWORD=${{ secrets.DB_ADMIN_PASSWORD }}"
"POSTGRES_SSLMODE=require"
```

These variables are now set in:
1. Line 446-451: Server container creation when previous deployment failed
2. Line 484-489: Server container update (existing deployment)
3. Line 521-526: Server container creation (initial deployment)

## Deployment

To apply this fix:

1. Commit and push the changes to the `azure-deploy.yml` workflow
2. The deployment will automatically update the server container with the correct environment variables
3. Test the GeoServer import functionality in the admin panel

## Verification

After deployment, you can verify the fix by:

1. Log into the admin panel at https://maapallo.info/admin
2. Try uploading a new GeoJSON layer
3. The import should now succeed and create the layer in both PostGIS and GeoServer

You can also check the server logs to confirm it's connecting to the correct database:
```bash
az containerapp logs show \
  --name maapallo-server \
  --resource-group maapallo-info-group \
  --follow
```

Look for log lines like:
```
[GeoServer] base=http://maapallo-geoserver/geoserver workspace=maapallo ...
OGR import target DB resolved host=maapallo-db-server-v2.postgres.database.azure.com ...
```

## Related Files Changed

- `.github/workflows/azure-deploy.yml` - Added POSTGRES_* environment variables for server container

## Notes

- The workflow already had the DB_NAME, DB_ADMIN_USER, and DB_ADMIN_PASSWORD variables set
- The code has fallback support for these legacy variable names (lines 496-512 in admin.py)
- However, POSTGRES_HOST had no fallback to the new server name, causing the issue
- This fix ensures the server always uses the correct database server name from the workflow's `DB_SERVER_NAME` variable

