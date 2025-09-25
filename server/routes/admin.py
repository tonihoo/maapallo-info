"""
Admin API for background GeoJSON imports into PostGIS.

Endpoints (JWT-protected):
- POST /api/v1/admin/import-geojson -> start background import, returns job_id
- GET  /api/v1/admin/import-jobs/{job_id} -> job status
- GET  /api/v1/admin/layers -> list layers with feature counts

This router ensures tables exist at runtime to be resilient in dev:
  geo_layers, geo_features, import_jobs
"""

import base64
import json
import logging
import os
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

import requests
from auth import require_auth
from config import settings
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
from services.geoserver_config import GeoServerConfigService
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

logger = logging.getLogger(__name__)


@router.get("/geoserver-persistence/diagnostics")
async def geoserver_persistence_diagnostics(
    current_user=Depends(require_auth),
):
    """Return runtime DB target & geoserver_* table stats (sanitized).

    Helps verify that the API process is connected to the same database the
    operator is inspecting (common issue: PG_* vs POSTGRES_* env mismatch).
    """
    from sqlalchemy import text

    async with async_session_maker() as session:  # type: ignore
        # Capture db identity & counts; ignore failures individually
        out = {}
        try:
            row = (
                await session.execute(
                    text(
                        "SELECT current_database() db, "
                        "inet_server_addr() host, inet_server_port() port"
                    )
                )
            ).first()
            if row:
                out["database"] = row.db
                out["server_addr"] = str(row.host)
                out["server_port"] = row.port
        except Exception as e:  # noqa: BLE001
            out["identity_error"] = str(e)

        for tbl in [
            "geoserver_workspaces",
            "geoserver_datastores",
            "geoserver_layers",
        ]:
            try:
                res = await session.execute(
                    text(f"SELECT count(*) AS c FROM {tbl}")
                )
                out[f"count_{tbl}"] = res.scalar()
            except Exception as e:  # noqa: BLE001
                out[f"count_{tbl}_error"] = str(e)

        return out


# GeoServer configuration (env driven). Precedence:
# 1. GEOSERVER_INTERNAL_URL (cluster-internal)
# 2. GEOSERVER_URL (public)
# 3. default (docker-compose local)
_internal_override = os.getenv("GEOSERVER_INTERNAL_URL")
_public_override = os.getenv("GEOSERVER_URL")
_chosen_source = "default"


def _normalize_geoserver_base(url: str) -> str:
    # Ensure it ends with /geoserver if user passed host root.
    u = url.rstrip("/")
    if not u.lower().endswith("/geoserver"):
        # Common cases: user gave http://host or http://host/geoserver/
        parts = u.split("/")
        if parts[-1] != "geoserver":
            u = u + "/geoserver"
    return u.rstrip("/")


if _internal_override:
    RAW_GEOSERVER_URL = _internal_override
    _chosen_source = "GEOSERVER_INTERNAL_URL"
elif _public_override:
    RAW_GEOSERVER_URL = _public_override
    _chosen_source = "GEOSERVER_URL"
else:
    RAW_GEOSERVER_URL = "http://geoserver:8080/geoserver"


GEOSERVER_URL = _normalize_geoserver_base(RAW_GEOSERVER_URL)
GEOSERVER_USER = os.getenv("GEOSERVER_USER", "admin")
GEOSERVER_PASSWORD = os.getenv("GEOSERVER_PASSWORD", "geoserver")
WORKSPACE_NAME = os.getenv("GEOSERVER_WORKSPACE", "maapallo")


async def ensure_layer_exists(table_name: str, datastore_name: str):
    """Ensure the layer exists in GeoServer for the given table/datastore."""
    headers = get_geoserver_auth()
    headers["Content-Type"] = "application/json"

    featuretype_url = (
        f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE_NAME}/"
        f"datastores/{datastore_name}/featuretypes/{table_name}"
    )
    logger.info("Checking layer: %s", featuretype_url)
    response = requests.get(featuretype_url, headers=headers, timeout=30)
    logger.info("Layer check response: %s", response.status_code)

    if response.status_code == 404:
        featuretype_data = {
            "featureType": {
                "name": table_name,
                "nativeName": table_name,
                "title": table_name.replace("_", " ").title(),
                "srs": "EPSG:4326",
                "enabled": True,
            }
        }
        create_url = (
            f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE_NAME}/"
            f"datastores/{datastore_name}/featuretypes"
        )
        logger.info("Creating layer at: %s", create_url)
        response = requests.post(
            create_url, headers=headers, json=featuretype_data, timeout=30
        )
        logger.info("Layer creation response: %s", response.status_code)
        if response.status_code not in [200, 201]:
            if response.status_code == 409:
                logger.info(
                    "Layer '%s' already exists in GeoServer (409)", table_name
                )
                return True
            logger.error(
                "Failed to create layer %s. Status: %s, Response: %s",
                table_name,
                response.status_code,
                response.text,
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create layer: {response.text}",
            )
        logger.info("Created GeoServer layer: %s", table_name)
    elif response.status_code == 200:
        logger.info("Layer %s already exists", table_name)
    else:
        logger.error(
            "Unexpected layer check response: %s - %s",
            response.status_code,
            response.text,
        )
    return True


print(
    "[GeoServer] base=%s workspace=%s user=%s src=%s pwd.len=%s"
    % (
        GEOSERVER_URL,
        WORKSPACE_NAME,
        GEOSERVER_USER,
        _chosen_source,
        len(GEOSERVER_PASSWORD) if GEOSERVER_PASSWORD else 0,
    )
)


def _maybe_auto_adjust_geoserver_url():
    """Attempt to auto-switch GeoServer URL if default host is unreachable.

    This helps in production if the legacy default 'geoserver:8080' does not
    resolve but internal Container Apps DNS (e.g. 'maapallo-geoserver') is
    available. Only runs once at import with very small timeouts.
    """
    global GEOSERVER_URL
    # Only consider adjusting if user did not override via env and the
    # current URL still points at the legacy docker-compose host.
    if "geoserver:8080" not in GEOSERVER_URL:
        return
    try:
        # Quick probe (expect 200/401/403). If it responds, keep it.
        requests.get(f"{GEOSERVER_URL}/rest", timeout=1)
        return
    except Exception as probe_err:  # noqa: BLE001
        alt = "http://maapallo-geoserver/geoserver"
        try:
            requests.get(f"{alt.rstrip('/')}/rest", timeout=1)
            logger.info(
                "GeoServer default host failed (%s); switched to %s",
                str(probe_err).__class__.__name__,
                alt,
            )
            GEOSERVER_URL = alt.rstrip("/")
        except Exception:  # noqa: BLE001
            logger.warning(
                "GeoServer auto-adjust failed; still using %s (err=%s)",
                GEOSERVER_URL,
                probe_err,
            )


_maybe_auto_adjust_geoserver_url()


@router.get("/geoserver-ping")
async def geoserver_ping(current_user=Depends(require_auth)):
    """Diagnostic endpoint to verify GeoServer connectivity & config.

    Returns the resolved base URL, workspace, and a simple REST probe result.
    """
    info: dict[str, object] = {
        "resolvedUrl": GEOSERVER_URL,
        "workspace": WORKSPACE_NAME,
        "source": _chosen_source,
    }
    try:
        resp = requests.get(f"{GEOSERVER_URL}/rest/workspaces", timeout=5)
        info.update(
            {
                "httpStatus": resp.status_code,
                "ok": resp.status_code in (200, 401, 403),
            }
        )
    except Exception as e:  # noqa: BLE001
        info.update({"ok": False, "error": str(e)})
    return info


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
    workspace_url = f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE_NAME}"
    logger.info("Checking workspace: %s", workspace_url)
    response = requests.get(workspace_url, headers=headers, timeout=30)

    logger.info("Workspace check response: %s", response.status_code)

    if response.status_code == 404:
        # Create workspace
        workspace_data = {"workspace": {"name": WORKSPACE_NAME}}
        create_url = f"{GEOSERVER_URL}/rest/workspaces"
        logger.info(
            "Creating workspace at: %s with data: %s",
            create_url,
            workspace_data,
        )
        response = requests.post(
            create_url,
            headers=headers,
            json=workspace_data,
            timeout=30,
        )
        if response.status_code not in [200, 201]:
            logger.error(
                "Failed to create workspace. Status: %s, Resp: %s",
                response.status_code,
                response.text,
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create workspace: {response.text}",
            )
        logger.info("Created workspace: %s", WORKSPACE_NAME)
    elif response.status_code == 200:
        logger.info("Workspace %s already exists", WORKSPACE_NAME)
    else:
        logger.error(
            "Unexpected workspace check response: %s - %s",
            response.status_code,
            response.text,
        )

    return True


async def ensure_datastore_exists():
    """Ensure the PostGIS datastore exists in GeoServer."""
    headers = get_geoserver_auth()
    headers["Content-Type"] = "application/json"

    # Use a canonical datastore name (align with restore-config script)
    datastore_name = os.getenv("GEOSERVER_DATASTORE_NAME", "postgis_maapallo")

    # Check if datastore exists
    datastore_url = (
        f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE_NAME}/"
        f"datastores/{datastore_name}"
    )
    logger.info("Checking datastore: %s", datastore_url)
    response = requests.get(datastore_url, headers=headers, timeout=30)
    logger.info("Datastore check response: %s", response.status_code)

    if response.status_code == 404:
        # Create PostGIS datastore using GeoServer-accessible params
        params = _resolve_geoserver_db_params()
        # Build rich connectionParameters (mirrors shell restore script)
        connection_params: dict[str, object] = {
            "host": params["host"],
            "port": str(params["port"]),
            "database": params["db"],
            "schema": "public",
            "user": params["user"],
            "passwd": params["password"],
            "dbtype": "postgis",
            "Loose bbox": "true",
            "Estimated extends": "false",
            "validate connections": "true",
            "Connection timeout": "20",
            "preparedStatements": "false",
        }
        # Include ssl mode if present (GeoServer sometimes expects either
        # 'sslmode' or 'SSL mode')
        sslmode = params.get("sslmode")
        if sslmode:
            connection_params["sslmode"] = sslmode
            connection_params["SSL mode"] = sslmode  # defensive duplicate

        # Optionally include namespace explicitly (not strictly required)
        connection_params["namespace"] = WORKSPACE_NAME

        datastore_data = {
            "dataStore": {
                "name": datastore_name,
                "connectionParameters": connection_params,
            }
        }

        # Mask password for logging
        log_preview = json.loads(json.dumps(datastore_data))
        try:
            log_preview["dataStore"]["connectionParameters"]["passwd"] = "***"
        except Exception:  # noqa: BLE001
            pass
        logger.info(
            "Creating datastore with parameters: %s",
            json.dumps(
                log_preview["dataStore"]["connectionParameters"],
                sort_keys=True,
            ),
        )
        response = requests.post(
            f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE_NAME}/datastores",
            headers=headers,
            json=datastore_data,
            timeout=30,
        )
        if response.status_code not in [200, 201]:
            body = response.text.strip()
            logger.error(
                "GeoServer datastore creation failed (HTTP %s) body=%s",
                response.status_code,
                body[:500],
            )
            # Provide structured failure detail to client
            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to create datastore: "
                    f"status={response.status_code} body={body or '[empty]'}"
                ),
            )
        logger.info("Created PostGIS datastore: %s", datastore_name)

    # Persist datastore registration in DB (best effort)
    try:
        async with async_session_maker() as session:  # type: ignore
            from services.geoserver_config import GeoServerConfigService

            svc = GeoServerConfigService(session)
            await svc.register_workspace(WORKSPACE_NAME, description=None)
            _cp = connection_params if "connection_params" in locals() else {}
            await svc.register_datastore(
                WORKSPACE_NAME,
                datastore_name,
                datastore_type="postgis",
                connection_params=_cp,
            )
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "Failed to persist datastore registration (non-fatal): %s", e
        )

    return datastore_name


def _resolve_db_params() -> dict:
    """Resolve DB connection parameters from env or settings."""
    # For production, use Azure PostgreSQL server
    if os.getenv("ENVIRONMENT") == "production":
        host = "maapallo-db-server.postgres.database.azure.com"
        port = 5432
        sslmode = "require"
    else:
        # Canonical preferred variable names: POSTGRES_HOST/PORT/SSLMBODE
        # Backwards-compatible fallbacks: pg_host/pg_port/pg_sslmode
        host = (
            os.getenv("POSTGRES_HOST")
            or os.getenv("pg_host")
            or settings.pg_host
        )
        port = int(
            os.getenv("POSTGRES_PORT")
            or os.getenv("pg_port")
            or settings.pg_port
        )
        sslmode = (
            os.getenv("POSTGRES_SSLMODE")
            or os.getenv("pg_sslmode")
            or settings.pg_sslmode
        )

    # Database name (prefer POSTGRES_DB then legacy DB_NAME)
    db = (
        os.getenv("POSTGRES_DB")
        or os.getenv("DB_NAME")
        or settings.pg_database
    )
    # User (prefer POSTGRES_USER then DB_ADMIN_USER)
    user = (
        os.getenv("POSTGRES_USER")
        or os.getenv("DB_ADMIN_USER")
        or settings.pg_user
    )
    # Password (prefer POSTGRES_PASSWORD then DB_ADMIN_PASSWORD)
    password = (
        os.getenv("POSTGRES_PASSWORD")
        or os.getenv("DB_ADMIN_PASSWORD")
        or settings.pg_pass
    )

    return {
        "host": host,
        "port": port,
        "db": db,
        "user": user,
        "password": password,
        "sslmode": sslmode,
    }


def _resolve_geoserver_db_params() -> dict:
    """Resolve DB connection parameters that GeoServer container can use.

    Since GeoServer runs in a separate container, we use the same database
    credentials that both containers have access to.
    """
    # Use the same database parameters but ensure they're accessible
    return _resolve_db_params()


async def import_geojson_to_postgis(file_path: Path, table_name: str):
    """Import GeoJSON to PostGIS using ogr2ogr (supports sslmode)."""

    params = _resolve_db_params()
    # Build ogr2ogr connection parts (avoid quoting password into logs)
    db_connection = (
        "PG:host={host} port={port} dbname={db} user={user} "
        "password={password}".format(**params)
    )
    if params["sslmode"] and params["sslmode"].lower() != "disable":
        db_connection += f" sslmode={params['sslmode']}"

    # Log the resolved target (without password) to help diagnose any future
    # "table disappeared" situations caused by pointing at a different DB.
    try:
        logger.info(
            "OGR import target DB resolved host=%s db=%s user=%s sslmode=%s",
            params.get("host"),
            params.get("db"),
            params.get("user"),
            params.get("sslmode"),
        )
    except Exception:  # pragma: no cover - log safety
        pass

    # Use ogr2ogr to import the GeoJSON
    result = subprocess.run(
        [
            "ogr2ogr",
            "-f",
            "PostgreSQL",
            db_connection,
            str(file_path),
            "-nln",
            table_name,
            "-overwrite",
            "-lco",
            "GEOMETRY_NAME=geom",
            "-lco",
            "FID=id",
        ],
        capture_output=True,
        text=True,
        timeout=300,
    )

    if result.returncode != 0:
        # Redact password if it sneaks into stderr
        stderr_safe = result.stderr.replace(params["password"], "********")
        logger.error("ogr2ogr failed: %s", stderr_safe)
        raise HTTPException(
            status_code=500,
            detail=f"Data import failed: {stderr_safe}",
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
            "enabled": True,
        }
    }

    featuretype_url = (
        f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE_NAME}/"
        f"datastores/{datastore_name}/featuretypes"
    )
    logger.info("Creating layer: %s at URL: %s", table_name, featuretype_url)
    logger.info("Layer data: %s", featuretype_data)
    response = requests.post(
        featuretype_url, headers=headers, json=featuretype_data, timeout=30
    )
    logger.info("Layer creation response: %s", response.status_code)

    if response.status_code not in [200, 201]:
        logger.error(
            "Failed to create layer %s. Status: %s, Response: %s",
            table_name,
            response.status_code,
            response.text,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to create layer: {response.text}"
        )

    logger.info("Created GeoServer layer: %s", table_name)
    return True


# --- Geometry / metadata helpers for persistence integration ---
async def detect_table_geometry(
    db: AsyncSession, table_name: str
) -> tuple[str, int, Optional[str]]:
    """Detect geometry column, SRID and type for a PostGIS table.

    Returns (geom_column, srid, geom_type). Falls back to ("geom", 4326, None)
    if detection fails. Errors are logged but not raised so that imports
    continue even if metadata introspection fails.
    """
    try:
        result = await db.execute(
            text(
                """
                SELECT g.f_geometry_column, g.srid, g.type
                FROM geometry_columns g
                WHERE g.f_table_schema = 'public'
                  AND g.f_table_name = :tbl
                LIMIT 1
                """
            ),
            {"tbl": table_name},
        )
        row = result.fetchone()
        if row:
            return row.f_geometry_column, int(row.srid), row.type
    except Exception as e:  # pragma: no cover - defensive
        logger.warning("Geometry detection failed for %s: %s", table_name, e)
    return "geom", 4326, None


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
                detail=(
                    "Layer name must contain only letters, numbers, "
                    "hyphens, and underscores"
                ),
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
    """Import an already-uploaded GeoJSON file into PostGIS and publish as a
    GeoServer layer.

    Steps:
      1. Validate request payload & uploaded file.
      2. Ensure workspace & datastore exist (idempotent).
      3. Load GeoJSON into PostGIS (ogr2ogr wrapper).
      4. Detect geometry metadata from the created table.
      5. Create/publish GeoServer layer via REST.
      6. Persist workspace, datastore, and layer metadata in application DB.
    """
    try:
        file_name = request.get("fileName")
        layer_name = request.get("layerName")
        debug = bool(request.get("debug"))
        logger.info(
            "[geoserver_import] start file=%s layer=%s debug=%s",
            file_name,
            layer_name,
            debug,
        )

        if not file_name:
            raise HTTPException(status_code=400, detail="fileName is required")
        if not layer_name:
            raise HTTPException(
                status_code=400, detail="layerName is required"
            )

        file_path = Path("/app/uploads") / file_name
        if not file_path.exists():
            raise HTTPException(
                status_code=404, detail=f"File {file_name} not found"
            )

        # Normalize table name
        table_name = layer_name.lower().replace("-", "_")

        # Ensure GeoServer workspace/datastore exist
        await ensure_workspace_exists()
        datastore_name = await ensure_datastore_exists()

        # Import data into PostGIS
        await import_geojson_to_postgis(file_path, table_name)

        # Detect geometry metadata
        async with async_session_maker() as detect_session:  # type: ignore
            geom_column, srid, geom_type = await detect_table_geometry(
                detect_session, table_name
            )

        # Create GeoServer layer
        await create_geoserver_layer(table_name, datastore_name)
        logger.info(
            "[geoserver_import] created GeoServer layer %s in datastore %s",
            table_name,
            datastore_name,
        )

        # Persist configuration
        try:
            # Open a session dedicated to persistence writes
            async with async_session_maker() as persist_session:
                config_service = GeoServerConfigService(persist_session)

                # Workspace (idempotent)
                try:
                    await config_service.register_workspace(WORKSPACE_NAME)
                except Exception as ws_e:  # pragma: no cover
                    logger.error(
                        "Workspace persistence failed %s: %s",
                        WORKSPACE_NAME,
                        ws_e,
                    )

                # Datastore (idempotent)
                try:
                    db_params = _resolve_db_params()
                    ds_params = {
                        "dbtype": "postgis",
                        "host": db_params.get("host"),
                        "port": db_params.get("port"),
                        "database": db_params.get("db"),
                        "user": db_params.get("user"),
                        "passwd": db_params.get("password"),
                        "schema": "public",
                        "Loose bbox": True,
                        "Estimated extends": False,
                        "validate connections": True,
                        "Connection timeout": 20,
                        "preparedStatements": False,
                    }
                    await config_service.register_datastore(
                        WORKSPACE_NAME,
                        datastore_name,
                        "postgis",
                        ds_params,
                    )
                except Exception as ds_e:  # pragma: no cover
                    logger.error(
                        "Datastore persistence failed %s:%s: %s",
                        WORKSPACE_NAME,
                        datastore_name,
                        ds_e,
                    )

                # Layer
                layer_config = {
                    "imported_via": "geoserver-import",
                    "detected_geometry_type": geom_type,
                    "registered_at": datetime.utcnow().isoformat(),
                }
                logger.info(
                    "[g_imp] layer ws=%s ds=%s layer=%s geom=%s srid=%s",
                    WORKSPACE_NAME,
                    datastore_name,
                    table_name,
                    geom_column,
                    srid,
                )
                await config_service.register_layer(
                    workspace_name=WORKSPACE_NAME,
                    datastore_name=datastore_name,
                    layer_name=table_name,
                    table_name=table_name,
                    geom_column=geom_column,
                    srid=srid,
                    layer_config=layer_config,
                )
            logger.info(
                "Persisted workspace=%s datastore=%s layer=%s",
                WORKSPACE_NAME,
                datastore_name,
                table_name,
            )
        except Exception as persist_e:  # pragma: no cover
            logger.error(
                "Failed to persist GeoServer config for layer %s: %s",
                table_name,
                persist_e,
            )

        # Optional post-persistence counts for debugging
        persistence_counts = None
        if debug:
            from sqlalchemy import text

            async with async_session_maker() as count_session:  # type: ignore
                try:
                    res = await count_session.execute(
                        text(
                            "SELECT (SELECT count(*) FROM geoserver_workspaces) w,"  # noqa: E501
                            " (SELECT count(*) FROM geoserver_datastores) d,"  # noqa: E501
                            " (SELECT count(*) FROM geoserver_layers) l"  # noqa: E501
                        )
                    )
                    row = res.first()
                    if row:
                        # Access by index because of shorter aliases
                        persistence_counts = {
                            "workspaces": row[0],
                            "datastores": row[1],
                            "layers": row[2],
                        }
                        logger.info(
                            "[geoserver_import] counts after import %s",
                            persistence_counts,
                        )
                except Exception as e:  # noqa: BLE001
                    logger.error(
                        "[geoserver_import] failed to get counts: %s", e
                    )

        logger.info(
            "Successfully imported %s as layer %s (debug=%s)",
            file_name,
            layer_name,
            debug,
        )
        response_payload = {
            "message": "Layer imported successfully",
            "fileName": file_name,
            "layerName": layer_name,
            "tableName": table_name,
            "workspace": WORKSPACE_NAME,
            "geomColumn": geom_column,
            "srid": srid,
            "geometryType": geom_type,
            "geoserverUrl": (
                f"{GEOSERVER_URL}/rest/layers/{WORKSPACE_NAME}:{table_name}"
            ),
        }
        if persistence_counts is not None:
            response_payload["persistenceCounts"] = persistence_counts
        return response_payload
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("GeoServer import failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")


@router.get("/db-ping")
async def db_ping(current_user=Depends(require_auth)):
    """Diagnostic DB reachability check (no sensitive secrets)."""
    params = _resolve_db_params()
    safe = {k: v for k, v in params.items() if k != "password"}
    # Attempt a lightweight psql connect via async engine already initialized
    from sqlalchemy import text

    try:
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
        safe["ok"] = True
    except Exception as e:  # noqa: BLE001
        safe["ok"] = False
        safe["error"] = str(e)
    return safe
