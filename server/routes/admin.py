"""
Admin API for background GeoJSON imports into PostGIS.

Endpoints (JWT-protected):
- POST /api/v1/admin/import-geojson -> start background import, returns job_id
- GET  /api/v1/admin/import-jobs/{job_id} -> job status
- GET  /api/v1/admin/layers -> list layers with feature counts

This router ensures tables exist at runtime to be resilient in dev:
  geo_layers, geo_features, import_jobs
"""

import json
import logging
import os
import shutil
import tempfile
import subprocess
import requests
import base64
from datetime import datetime
from pathlib import Path
from typing import Optional

from auth import require_auth
from database import async_session_maker, get_db
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

logger = logging.getLogger(__name__)

# GeoServer configuration
GEOSERVER_URL = "http://geoserver:8080/geoserver"
GEOSERVER_USER = "admin"
GEOSERVER_PASSWORD = "geoserver"
WORKSPACE_NAME = "maapallo"


def get_geoserver_auth():
    """Get basic auth headers for GeoServer REST API."""
    credentials = f"{GEOSERVER_USER}:{GEOSERVER_PASSWORD}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    return {"Authorization": f"Basic {encoded_credentials}"}


async def ensure_workspace_exists():
    """Ensure the workspace exists in GeoServer."""
    headers = get_geoserver_auth()
    headers["Content-Type"] = "application/json"
    
    # Check if workspace exists
    response = requests.get(
        f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE_NAME}",
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 404:
        # Create workspace
        workspace_data = {
            "workspace": {
                "name": WORKSPACE_NAME
            }
        }
        response = requests.post(
            f"{GEOSERVER_URL}/rest/workspaces",
            headers=headers,
            json=workspace_data,
            timeout=30
        )
        if response.status_code not in [200, 201]:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create workspace: {response.text}"
            )
        logger.info("Created workspace: %s", WORKSPACE_NAME)
    
    return True


async def ensure_datastore_exists():
    """Ensure the PostGIS datastore exists in GeoServer."""
    headers = get_geoserver_auth()
    headers["Content-Type"] = "application/json"
    
    datastore_name = "postgis"
    
    # Check if datastore exists
    datastore_url = (
        f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE_NAME}/"
        f"datastores/{datastore_name}"
    )
    response = requests.get(datastore_url, headers=headers, timeout=30)
    
    if response.status_code == 404:
        # Create PostGIS datastore
        datastore_data = {
            "dataStore": {
                "name": datastore_name,
                "connectionParameters": {
                    "host": os.getenv("PG_HOST", "db"),
                    "port": int(os.getenv("PG_PORT", "5432")),
                    "database": os.getenv("PG_DB", "db_dev"),
                    "user": os.getenv("PG_USER", "db_dev_user"),
                    "passwd": os.getenv("PG_PASSWORD", "DevPassword"),
                    "dbtype": "postgis"
                }
            }
        }
        response = requests.post(
            f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE_NAME}/datastores",
            headers=headers,
            json=datastore_data,
            timeout=30
        )
        if response.status_code not in [200, 201]:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create datastore: {response.text}"
            )
        logger.info("Created PostGIS datastore: %s", datastore_name)
    
    return datastore_name


async def import_geojson_to_postgis(file_path: Path, table_name: str):
    """Import GeoJSON to PostGIS using ogr2ogr."""
    
    # Database connection string
    db_connection = (
        f"PG:host={os.getenv('PG_HOST', 'db')} "
        f"port={os.getenv('PG_PORT', '5432')} "
        f"dbname={os.getenv('PG_DB', 'db_dev')} "
        f"user={os.getenv('PG_USER', 'db_dev_user')} "
        f"password={os.getenv('PG_PASSWORD', 'DevPassword')}"
    )
    
    # Use ogr2ogr to import the GeoJSON
    result = subprocess.run([
        "ogr2ogr",
        "-f", "PostgreSQL",
        db_connection,
        str(file_path),
        "-nln", table_name,
        "-overwrite",
        "-lco", "GEOMETRY_NAME=geom",
        "-lco", "FID=id"
    ], capture_output=True, text=True, timeout=300)
    
    if result.returncode != 0:
        logger.error("ogr2ogr failed: %s", result.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Data import failed: {result.stderr}"
        )
    
    logger.info(
        "Successfully imported %s to PostGIS table %s", file_path, table_name
    )
    return True


async def create_geoserver_layer(table_name: str, datastore_name: str):
    """Create a layer in GeoServer from PostGIS table."""
    headers = get_geoserver_auth()
    headers["Content-Type"] = "application/json"
    
    # Create featuretype (layer)
    featuretype_data = {
        "featureType": {
            "name": table_name,
            "nativeName": table_name,
            "title": table_name.replace("_", " ").title(),
            "srs": "EPSG:4326",
            "enabled": True
        }
    }
    
    featuretype_url = (
        f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE_NAME}/"
        f"datastores/{datastore_name}/featuretypes"
    )
    response = requests.post(
        featuretype_url,
        headers=headers,
        json=featuretype_data,
        timeout=30
    )
    
    if response.status_code not in [200, 201]:
        logger.error("Failed to create layer: %s", response.text)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create layer: {response.text}"
        )
    
    logger.info("Created GeoServer layer: %s", table_name)
    return True


async def _ensure_tables(db: AsyncSession) -> None:
    """Create required tables if they don't exist.

    Execute each DDL separately to avoid asyncpg multi-statement issues.
    """
    statements = [
        # geo_layers
        """
        CREATE TABLE IF NOT EXISTS geo_layers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(128) UNIQUE NOT NULL,
            title VARCHAR(255),
            geom_type VARCHAR(32) DEFAULT 'GEOMETRY',
            srid INTEGER DEFAULT 4326,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # geo_features
        """
        CREATE TABLE IF NOT EXISTS geo_features (
            id SERIAL PRIMARY KEY,
            layer_id INTEGER NOT NULL REFERENCES geo_layers(id)
                ON DELETE CASCADE,
            properties JSONB,
            geom GEOMETRY(GEOMETRY, 4326) NOT NULL
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_geo_features_layer
        ON geo_features (layer_id)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_geo_features_geom
        ON geo_features USING GIST (geom)
        """,
        # import_jobs
        """
        CREATE TABLE IF NOT EXISTS import_jobs (
            id SERIAL PRIMARY KEY,
            layer_name VARCHAR(128) NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'queued',
            total INTEGER,
            processed INTEGER DEFAULT 0,
            errors INTEGER DEFAULT 0,
            message TEXT,
            file_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
    ]

    for stmt in statements:
        await db.execute(text(stmt))
    await db.commit()


async def _upsert_layer(
    db: AsyncSession, name: str, title: Optional[str], srid: int
) -> int:
    await db.execute(
        text(
            """
            INSERT INTO geo_layers(name, title, srid)
            VALUES (:name, :title, :srid)
            ON CONFLICT (name) DO NOTHING
            """
        ),
        {"name": name, "title": title or name, "srid": srid},
    )
    result = await db.execute(
        text("SELECT id FROM geo_layers WHERE name = :name"),
        {"name": name},
    )
    layer_id = result.scalar()
    if not layer_id:
        raise HTTPException(status_code=500, detail="Failed to upsert layer")
    return int(layer_id)


async def _update_job(
    db: AsyncSession,
    job_id: int,
    *,
    status_val: Optional[str] = None,
    processed: Optional[int] = None,
    total: Optional[int] = None,
    errors: Optional[int] = None,
    message: Optional[str] = None,
) -> None:
    sets = ["updated_at = :updated_at"]
    params = {"updated_at": datetime.utcnow(), "job_id": job_id}
    if status_val is not None:
        sets.append("status = :status")
        params["status"] = status_val
    if processed is not None:
        sets.append("processed = :processed")
        params["processed"] = processed
    if total is not None:
        sets.append("total = :total")
        params["total"] = total
    if errors is not None:
        sets.append("errors = :errors")
        params["errors"] = errors
    if message is not None:
        sets.append("message = :message")
        params["message"] = message

    await db.execute(
        text(f"UPDATE import_jobs SET {', '.join(sets)} WHERE id = :job_id"),
        params,
    )
    await db.commit()


async def _background_import(
    job_id: int,
    tmp_path: str,
    layer_name: str,
    srid: int,
) -> None:
    # Open a fresh session in background task
    async with async_session_maker() as db:
        try:
            logger.info(
                "Starting import job id=%s layer=%s srid=%s",
                job_id,
                layer_name,
                srid,
            )
            await _ensure_tables(db)
            await _update_job(db, job_id, status_val="processing")

            # Read GeoJSON file
            with open(tmp_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            features = data.get("features") or []
            total = len(features)
            await _update_job(db, job_id, total=total)

            # Prepare layer (commit immediately so it appears in lists even
            # if later steps fail)
            layer_id = await _upsert_layer(db, layer_name, layer_name, srid)
            await db.commit()

            processed = 0
            errors = 0
            error_samples: list[str] = []
            sample_limit = int(os.getenv("IMPORT_ERROR_SAMPLES", "5"))

            # Insert in batches (smaller for faster feedback)
            batch = []
            batch_size = int(os.getenv("IMPORT_BATCH_SIZE", "50"))

            for feat in features:
                geom = feat.get("geometry")
                props = feat.get("properties") or {}
                if not geom:
                    errors += 1
                    continue

                batch.append(
                    {
                        "geom": json.dumps(geom),
                        "props": json.dumps(props),
                    }
                )

                if len(batch) >= batch_size:
                    try:
                        await _flush_batch(db, layer_id, srid, batch)
                        processed += len(batch)
                        await _update_job(
                            db,
                            job_id,
                            processed=processed,
                            errors=errors,
                            message=(
                                f"Inserted {processed}/{total}. "
                                f"Errors: {errors}"
                            ),
                        )
                    except Exception as e:
                        # Fallback to per-row inserts to skip bad records
                        logger.warning(
                            "Batch insert failed for layer_id=%s: %s",
                            layer_id,
                            str(e),
                        )
                        if len(error_samples) < sample_limit:
                            error_samples.append(f"batch error: {str(e)}")
                        inserted_ok = await _flush_batch_individual(
                            db,
                            layer_id,
                            srid,
                            batch,
                            on_error=lambda ex, _item: (
                                error_samples.append(f"row error: {str(ex)}")
                                if len(error_samples) < sample_limit
                                else None
                            ),
                        )
                        processed += len(batch)
                        errors += len(batch) - inserted_ok
                        await _update_job(
                            db,
                            job_id,
                            processed=processed,
                            errors=errors,
                            message=(
                                "Batch fallback: "
                                f"{inserted_ok}/{len(batch)} inserted. "
                                f"Errors: {errors}. "
                                + (
                                    "Samples: " + "; ".join(error_samples)
                                    if error_samples
                                    else ""
                                )
                            ).strip(),
                        )
                    finally:
                        batch = []

            if batch:
                try:
                    await _flush_batch(db, layer_id, srid, batch)
                    processed += len(batch)
                    await _update_job(
                        db,
                        job_id,
                        processed=processed,
                        errors=errors,
                        message=(
                            f"Inserted {processed}/{total}. "
                            f"Errors: {errors}"
                        ),
                    )
                except Exception as e:
                    logger.warning(
                        "Final batch failed for layer_id=%s: %s",
                        layer_id,
                        str(e),
                    )
                    if len(error_samples) < sample_limit:
                        error_samples.append(f"batch error: {str(e)}")
                    inserted_ok = await _flush_batch_individual(
                        db,
                        layer_id,
                        srid,
                        batch,
                        on_error=lambda ex, _item: (
                            error_samples.append(f"row error: {str(ex)}")
                            if len(error_samples) < sample_limit
                            else None
                        ),
                    )
                    processed += len(batch)
                    errors += len(batch) - inserted_ok
                    await _update_job(
                        db,
                        job_id,
                        processed=processed,
                        errors=errors,
                        message=(
                            "Final batch fallback: "
                            f"{inserted_ok}/{len(batch)} inserted. "
                            f"Errors: {errors}. "
                            + (
                                "Samples: " + "; ".join(error_samples)
                                if error_samples
                                else ""
                            )
                        ),
                    )

            final_msg = (
                f"Completed. Inserted {processed}/{total}. "
                f"Errors: {errors}. "
                + (
                    "Samples: " + "; ".join(error_samples)
                    if error_samples
                    else ""
                )
            )
            await _update_job(
                db, job_id, status_val="completed", message=final_msg
            )
            logger.info(
                "Job id=%s completed. processed=%s errors=%s",
                job_id,
                processed,
                errors,
            )
        except Exception as e:
            logger.error("Job id=%s failed: %s", job_id, str(e))
            await _update_job(db, job_id, status_val="failed", message=str(e))
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass


async def _flush_batch(
    db: AsyncSession, layer_id: int, srid: int, batch: list[dict]
) -> None:
    # Build a VALUES list for better performance
    # Each row: (:layer_id, :props, ST_GeomFromGeoJSON(:geom))
    await db.execute(
        text(
            """
            INSERT INTO geo_features(layer_id, properties, geom)
            SELECT :layer_id,
             CAST(v.props AS jsonb),
                   CASE
                     WHEN :srid = 4326 THEN
                       ST_SetSRID(ST_GeomFromGeoJSON(v.geom), 4326)
                     ELSE
                       ST_Transform(
                         ST_SetSRID(ST_GeomFromGeoJSON(v.geom), :srid), 4326)
                   END
         FROM jsonb_to_recordset(CAST(:vals AS jsonb))
                 AS v(geom text, props text)
            """
        ),
        {
            "layer_id": layer_id,
            "srid": srid,
            "vals": json.dumps(batch),
        },
    )
    await db.commit()


async def _flush_batch_individual(
    db: AsyncSession,
    layer_id: int,
    srid: int,
    batch: list[dict],
    on_error=None,
) -> int:
    """Fallback insert one-by-one to skip bad geometries."""
    inserted = 0
    for item in batch:
        try:
            await db.execute(
                text(
                    """
                    INSERT INTO geo_features(layer_id, properties, geom)
                    VALUES (
                      :layer_id,
                      CAST(:props AS jsonb),
                      CASE WHEN :srid = 4326 THEN
                        ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)
                      ELSE
                        ST_Transform(
                          ST_SetSRID(ST_GeomFromGeoJSON(:geom), :srid), 4326)
                      END
                    )
                    """
                ),
                {
                    "layer_id": layer_id,
                    "srid": srid,
                    "geom": item["geom"],
                    "props": item["props"],
                },
            )
            inserted += 1
            # Commit in small chunks to avoid long transactions
            if inserted % 20 == 0:
                await db.commit()
        except Exception as ex:
            # Log and optionally record sample, then skip bad row
            logger.warning("Row insert failed: %s", str(ex))
            if on_error is not None:
                try:
                    on_error(ex, item)
                except Exception:
                    pass
            continue
    await db.commit()
    return inserted


@router.post("/import-geojson")
async def import_geojson(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    layer_name: str = Form(...),
    srid: int = Form(4326),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_auth),
):
    """Start a background import from an uploaded GeoJSON file."""
    try:
        await _ensure_tables(db)

        # Ensure a layer record exists immediately so it appears in lists
        # even before the background job finishes inserting features.
        try:
            await _upsert_layer(db, layer_name, layer_name, srid)
            await db.commit()
        except Exception:
            # Ignore upsert errors here; background task will try again.
            await db.rollback()

        # Save upload to a temp file
        suffix = os.path.splitext(file.filename or "upload.geojson")[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            content = await file.read()
            tmp.write(content)

        # Create job
        result = await db.execute(
            text(
                """
                INSERT INTO import_jobs(layer_name, status, file_path)
                VALUES (:layer_name, 'queued', :file_path)
                RETURNING id
                """
            ),
            {"layer_name": layer_name, "file_path": tmp_path},
        )
        job_scalar = result.scalar()
        if job_scalar is None:
            raise HTTPException(status_code=500, detail="Failed to create job")
        job_id = int(job_scalar)
        await db.commit()

        # Kick background task
        background_tasks.add_task(
            _background_import, job_id, tmp_path, layer_name, srid
        )

        return {"job_id": job_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/import-jobs/{job_id}")
async def get_import_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_auth),
):
    result = await db.execute(
        text(
            """
            SELECT id, layer_name, status, total, processed, errors,
                   message, created_at, updated_at
            FROM import_jobs WHERE id = :id
            """
        ),
        {"id": job_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return dict(row)


@router.get("/layers")
async def admin_list_layers(
    db: AsyncSession = Depends(get_db), current_user=Depends(require_auth)
):
    result = await db.execute(
        text(
            """
            SELECT l.id, l.name, l.title, l.geom_type, l.srid,
                   COALESCE(cnt.count, 0) AS feature_count,
                   l.created_at
            FROM geo_layers l
            LEFT JOIN (
              SELECT layer_id, COUNT(*) AS count
              FROM geo_features GROUP BY layer_id
            ) cnt ON cnt.layer_id = l.id
            ORDER BY l.title NULLS LAST, l.name
            """
        )
    )
    return {"layers": [dict(r) for r in result.mappings().all()]}


@router.post("/geoserver-upload")
async def geoserver_upload(
    file: UploadFile = File(...),
    layerName: str = Form(...),
    current_user=Depends(require_auth),
):
    """Upload a file to GeoServer uploads directory for processing."""
    try:
        # Validate file type
        if not file.filename or not file.filename.lower().endswith(".geojson"):
            raise HTTPException(
                status_code=400, detail="Only .geojson files are supported"
            )

        # Validate layer name
        if (
            not layerName
            or not layerName.replace("_", "").replace("-", "").isalnum()
        ):
            raise HTTPException(
                status_code=400,
                detail="Layer name must contain only letters, numbers, hyphens, and underscores",
            )

        # Create uploads directory if it doesn't exist
        uploads_dir = Path("/app/uploads")
        uploads_dir.mkdir(parents=True, exist_ok=True)

        # Use original filename or create one based on layer name
        filename = file.filename if file.filename else f"{layerName}.geojson"
        file_path = uploads_dir / filename

        # Save the uploaded file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        logger.info(
            "File uploaded to GeoServer uploads: %s (%d bytes)",
            file_path,
            len(content),
        )

        return {
            "message": f"File uploaded successfully to {filename}",
            "fileName": filename,
            "layerName": layerName,
            "size": len(content),
        }

    except Exception as e:
        logger.error("GeoServer upload failed: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/geoserver-import")
async def geoserver_import(
    request: dict,
    current_user=Depends(require_auth),
):
    """Import uploaded file to GeoServer using REST API."""
    try:
        file_name = request.get("fileName")
        layer_name = request.get("layerName")
        
        if not file_name:
            raise HTTPException(status_code=400, detail="fileName is required")
        if not layer_name:
            raise HTTPException(
                status_code=400, detail="layerName is required"
            )

        # Validate file exists
        file_path = Path("/app/uploads") / file_name
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"File {file_name} not found"
            )

        # Ensure GeoServer workspace and datastore exist
        await ensure_workspace_exists()
        datastore_name = await ensure_datastore_exists()

        # Import to PostGIS
        table_name = layer_name.lower().replace("-", "_")
        await import_geojson_to_postgis(file_path, table_name)

        # Create GeoServer layer
        await create_geoserver_layer(table_name, datastore_name)

        logger.info(
            "Successfully imported %s as layer %s", file_name, layer_name
        )

        return {
            "message": "Layer imported successfully",
            "fileName": file_name,
            "layerName": layer_name,
            "tableName": table_name,
            "workspace": WORKSPACE_NAME,
            "geoserverUrl": (
                f"{GEOSERVER_URL}/rest/layers/{WORKSPACE_NAME}:{table_name}"
            )
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error("GeoServer import failed: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {str(e)}"
        )
