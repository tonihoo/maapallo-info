# Azure PostgreSQL Data Import Guide

## Option 1: Upload via Azure Cloud Shell + ogr2ogr

```bash
# 1. Upload your GeoJSON to Azure Cloud Shell
# 2. Use ogr2ogr to import directly to PostgreSQL
ogr2ogr -f "PostgreSQL" \
    "PG:host=your-server.postgres.database.azure.com port=5432 user=username@servername password=password dbname=maapallo_db sslmode=require" \
    pop_density_by_country_2022_num.geojson \
    -nln pop_density_by_country_2022_num \
    -overwrite
```

## Option 2: Upload to App Service + Run Import Script

```bash
# 1. Upload GeoJSON via Azure portal or SCP
# 2. SSH into your App Service
# 3. Run your import script
python3 import_qgis_population_data.py
```

## Option 3: Azure Storage + Download Script

Create a script that downloads from Azure Blob Storage:

```python
# download_and_import.py
from azure.storage.blob import BlobServiceClient
import os

def download_geojson_from_azure():
    # Download from Azure Storage
    blob_service_client = BlobServiceClient(connection_string="your_connection_string")

    with open("pop_density_data.geojson", "wb") as download_file:
        download_file.write(
            blob_service_client.get_blob_client(
                container="data",
                blob="pop_density_by_country_2022_num.geojson"
            ).download_blob().readall()
        )

    # Then run import
    import asyncio
    from import_qgis_population_data import import_population_data
    asyncio.run(import_population_data())

if __name__ == "__main__":
    download_geojson_from_azure()
```

## Option 4: Include Data in Docker Build (For Production)

```dockerfile
# In your Dockerfile
COPY client/public/data/pop_density_by_country_2022_num.geojson /app/data/
```

## Recommendation

For your first deployment, use **Option 1 (Manual Upload)** because:
- ✅ Simple and reliable
- ✅ One-time setup
- ✅ Data stays in PostgreSQL permanently
- ✅ No additional infrastructure needed
