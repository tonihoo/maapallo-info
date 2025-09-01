"""
Generic Layers API for serving vector data from PostGIS

Endpoints:
- GET /api/v1/layers/list -> list registered layers
- GET /api/v1/layers/geojson/{layer_name} -> FeatureCollection GeoJSON
    (optional bbox)

Tables expected (created via migration 0006_create_geo_layers):
- geo_layers(id serial pk, name unique, title, srid, geom_type,
    created_at, metadata jsonb)
- geo_features(id serial pk, layer_id fk, properties jsonb,
    geom geometry(..., 4326))
"""

from typing import Optional

from config import settings
from database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/layers", tags=["Layers"])


async def _ensure_geo_tables(db: AsyncSession) -> None:
    """Ensure geo_layers and geo_features exist (idempotent)."""
    stmts = [
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
    ]

    for s in stmts:
        await db.execute(text(s))
    await db.commit()


@router.get("/list")
async def list_layers(db: AsyncSession = Depends(get_db)):
    """List available layers from geo_layers with feature counts."""
    try:
        await _ensure_geo_tables(db)
        result = await db.execute(
            text(
                """
                SELECT l.name, l.title, l.geom_type, l.srid,
                       COALESCE(cnt.count, 0) AS feature_count,
                       l.created_at,
                       l.metadata
                FROM geo_layers l
                LEFT JOIN (
                    SELECT layer_id, COUNT(*) AS count
                    FROM geo_features
                    GROUP BY layer_id
                ) cnt ON cnt.layer_id = l.id
                ORDER BY l.title NULLS LAST, l.name
                """
            )
        )
        rows = result.mappings().all()
        return {"layers": [dict(r) for r in rows]}
    except Exception as e:
        # Graceful degrade: intermittent DB errors should not break UI
        if any(
            s in str(e).lower()
            for s in [
                "connection",
                "timeout",
                "closed",
                "terminating connection",
                "cannot connect",
            ]
        ):
            return {"layers": [], "note": "db_unavailable"}
        raise HTTPException(
            status_code=500, detail=f"Database error: {str(e)}"
        )


@router.get("/geojson/{layer_name}")
async def get_layer_geojson(
    layer_name: str,
    bbox: Optional[str] = Query(
        None,
        description="Bounding box filter as minx,miny,maxx,maxy in EPSG:4326",
    ),
    limit: Optional[int] = Query(
        None, description="Optional limit on number of features returned"
    ),
    db: AsyncSession = Depends(get_db),
):
    """Return a FeatureCollection GeoJSON for the given layer.

    If bbox is provided, features will be filtered to those intersecting
    the envelope.
    """
    try:
        await _ensure_geo_tables(db)
        # Resolve layer id with flexible matching:
        # - case-insensitive
        # - normalize non-alphanumerics to '_' (slug) for name/title
        layer_row = await db.execute(
            text(
                """
                SELECT id
                FROM geo_layers
                WHERE lower(regexp_replace(name, '[^a-z0-9]+', '_', 'g')) =
                          lower(regexp_replace(:q, '[^a-z0-9]+', '_', 'g'))
                   OR lower(regexp_replace(COALESCE(title, ''),
                          '[^a-z0-9]+', '_', 'g')) =
                          lower(regexp_replace(:q, '[^a-z0-9]+', '_', 'g'))
                LIMIT 1
                """
            ),
            {"q": layer_name},
        )
        layer_id = layer_row.scalar()
        if not layer_id:
            raise HTTPException(status_code=404, detail="Layer not found")

        # Build dynamic filter
        filters = ["layer_id = :layer_id"]
        params: dict = {"layer_id": layer_id}

        if bbox:
            try:
                minx, miny, maxx, maxy = [float(v) for v in bbox.split(",")]
            except Exception:
                raise HTTPException(
                    status_code=400, detail="Invalid bbox format"
                )
            filters.append(
                "ST_Intersects(geom, ST_MakeEnvelope("
                ":minx, :miny, :maxx, :maxy, 4326))"
            )
            params.update(
                {"minx": minx, "miny": miny, "maxx": maxx, "maxy": maxy}
            )

        limit_clause = ""
        if limit and limit > 0:
            limit_clause = " LIMIT :limit"
            params["limit"] = limit

        query = text(
            f"""
            SELECT jsonb_build_object(
                'type', 'FeatureCollection',
                'features', COALESCE(jsonb_agg(features.feature), '[]'::jsonb)
            ) AS geojson
            FROM (
                SELECT jsonb_build_object(
                    'type', 'Feature',
                    'properties', COALESCE(properties, '{{}}'::jsonb),
                    'geometry', ST_AsGeoJSON(geom)::jsonb
                ) AS feature
                FROM geo_features
                WHERE {' AND '.join(filters)}
                {limit_clause}
            ) AS features
            """
        )

        result = await db.execute(query, params)
        data = result.scalar()
        return data if data else {"type": "FeatureCollection", "features": []}

    except HTTPException:
        raise
    except Exception as e:
        # Graceful degrade for transient DB errors
        if any(
            s in str(e).lower()
            for s in [
                "connection",
                "timeout",
                "closed",
                "terminating connection",
                "cannot connect",
            ]
        ):
            return {"type": "FeatureCollection", "features": []}
        raise HTTPException(
            status_code=500, detail=f"Database error: {str(e)}"
        )


@router.get("/debug")
async def debug_layers(db: AsyncSession = Depends(get_db)):
    """Development-only: show DB info and table counts for diagnostics."""
    if settings.environment != "development":
        raise HTTPException(status_code=404, detail="Not found")

    try:
        await _ensure_geo_tables(db)

        # Counts
        cnt_layers = await db.execute(text("SELECT COUNT(*) FROM geo_layers"))
        cnt_features = await db.execute(
            text("SELECT COUNT(*) FROM geo_features")
        )
        # import_jobs table may not exist here; guard it
        try:
            cnt_jobs = await db.execute(
                text("SELECT COUNT(*) FROM import_jobs")
            )
            jobs_count = int(cnt_jobs.scalar() or 0)
        except Exception:
            jobs_count = 0

        # Sample layers
        layers_res = await db.execute(
            text(
                """
                SELECT name, title, srid, created_at
                FROM geo_layers
                ORDER BY created_at DESC
                LIMIT 10
                """
            )
        )
        layers_rows = [dict(r) for r in layers_res.mappings().all()]

        # Redacted DB info
        db_info = {
            "host": settings.pg_host,
            "port": settings.pg_port,
            "database": settings.pg_database,
            "user": settings.pg_user,
            "sslmode": settings.pg_sslmode,
            "environment": settings.environment,
        }

        return {
            "db": db_info,
            "counts": {
                "geo_layers": int(cnt_layers.scalar() or 0),
                "geo_features": int(cnt_features.scalar() or 0),
                "import_jobs": jobs_count,
            },
            "layers": layers_rows,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
