"""
General migration system for Maapallo.info
Handles database schema changes and data imports for any layer type
"""

import json
import logging
from pathlib import Path
from typing import Dict, Optional

from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["migrations"])

logger = logging.getLogger(__name__)


# Migration definitions
MIGRATIONS = {
    "0001_create_feature_table": {
        "description": "Creates the main feature table with PostGIS support",
        "sql": """
        CREATE TABLE IF NOT EXISTS features (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            geom GEOMETRY(POINT, 4326),
            properties JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_features_geom
        ON features USING GIST (geom);
        CREATE INDEX IF NOT EXISTS idx_features_category
        ON features (category);
        CREATE INDEX IF NOT EXISTS idx_features_properties
        ON features USING GIN (properties);
        """,
    },
    "0002_add_test_data": {
        "description": "Adds sample data for development and testing",
        "sql": "-- Sample data migration (implement as needed)",
    },
    "0003_create_analytics_tables": {
        "description": "Creates privacy-focused analytics tables",
        "sql": """
        CREATE TABLE IF NOT EXISTS analytics_sessions (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) UNIQUE NOT NULL,
            country VARCHAR(2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS page_views (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) REFERENCES analytics_sessions(session_id),
            page_path VARCHAR(2048) NOT NULL,
            page_title VARCHAR(512),
            referrer VARCHAR(2048),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS custom_events (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) REFERENCES analytics_sessions(session_id),
            event_name VARCHAR(128) NOT NULL,
            event_data JSONB,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_page_views_session
        ON page_views (session_id);
        CREATE INDEX IF NOT EXISTS idx_page_views_timestamp
        ON page_views (timestamp);
        CREATE INDEX IF NOT EXISTS idx_custom_events_session
        ON custom_events (session_id);
        CREATE INDEX IF NOT EXISTS idx_custom_events_timestamp
        ON custom_events (timestamp);
        """,
    },
    "0004_add_population_density_2022": {
        "description": "Creates table for population density by country data",
        "sql": """
        CREATE TABLE IF NOT EXISTS pop_density_by_country_2022_num (
            id SERIAL PRIMARY KEY,
            "NAME" VARCHAR(255),
            "ISO_A3" VARCHAR(3),
            pop_density_2022_num DECIMAL(10,3),
            geom GEOMETRY(MULTIPOLYGON, 4326)
        );

        CREATE INDEX IF NOT EXISTS idx_pop_density_geom
        ON pop_density_by_country_2022_num USING GIST (geom);

        CREATE INDEX IF NOT EXISTS idx_pop_density_iso
        ON pop_density_by_country_2022_num ("ISO_A3");
        """,
        "data_files": [
            (
                "/home/site/wwwroot/server/"
                "pop_density_by_country_2022_num.geojson"
            ),
            "/home/site/wwwroot/pop_density_by_country_2022_num.geojson",
            (
                "/opt/python/current/app/server/"
                "pop_density_by_country_2022_num.geojson"
            ),
            "/opt/python/current/app/pop_density_by_country_2022_num.geojson",
            "/app/pop_density_data.geojson",
        ],
    },
    # Future migrations can be added here
    "0005_add_climate_data": {
        "description": "Creates table for climate data layers",
        "sql": """
        CREATE TABLE IF NOT EXISTS climate_data (
            id SERIAL PRIMARY KEY,
            "NAME" VARCHAR(255),
            "ISO_A3" VARCHAR(3),
            temperature_avg DECIMAL(5,2),
            precipitation_mm DECIMAL(8,2),
            year INTEGER,
            geom GEOMETRY(MULTIPOLYGON, 4326)
        );

        CREATE INDEX IF NOT EXISTS idx_climate_geom
        ON climate_data USING GIST (geom);

        CREATE INDEX IF NOT EXISTS idx_climate_iso ON climate_data ("ISO_A3");
        CREATE INDEX IF NOT EXISTS idx_climate_year ON climate_data (year);
        """,
    },
}


@router.get("/")
async def list_migrations():
    """List all available migrations"""
    return {
        "migrations": [
            {
                "id": migration_id,
                "description": migration_data["description"],
                "has_data_files": "data_files" in migration_data,
            }
            for migration_id, migration_data in MIGRATIONS.items()
        ]
    }


@router.post("/run/{migration_id}")
async def run_migration(migration_id: str, db: AsyncSession = Depends(get_db)):
    """Run a specific migration"""
    if migration_id not in MIGRATIONS:
        raise HTTPException(
            status_code=404, detail=f"Migration {migration_id} not found"
        )

    migration = MIGRATIONS[migration_id]

    try:
        # Split SQL statements and execute them separately
        sql_statements = [
            stmt.strip()
            for stmt in migration["sql"].split(";")
            if stmt.strip()
        ]

        for sql_stmt in sql_statements:
            if sql_stmt:
                await db.execute(text(sql_stmt))

        await db.commit()

        return {
            "status": "success",
            "migration_id": migration_id,
            "description": migration["description"],
            "message": f"Migration {migration_id} completed successfully",
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Migration failed: {str(e)}"
        )


@router.post("/import-data/{migration_id}")
async def import_migration_data(
    migration_id: str, db: AsyncSession = Depends(get_db)
):
    """Import data for a specific migration"""
    if migration_id not in MIGRATIONS:
        raise HTTPException(
            status_code=404, detail=f"Migration {migration_id} not found"
        )

    migration = MIGRATIONS[migration_id]

    if "data_files" not in migration:
        raise HTTPException(
            status_code=400,
            detail=f"Migration {migration_id} has no data import capability",
        )

    # Find the data file
    data_file = None
    for file_path in migration["data_files"]:
        if Path(file_path).exists():
            data_file = Path(file_path)
            break

    if not data_file:
        return {
            "status": "error",
            "message": "No data file found",
            "searched_paths": migration["data_files"],
        }

    try:
        # Load and import data based on migration type
        if migration_id == "0004_add_population_density_2022":
            result = await _import_population_density_data(data_file, db)
        else:
            # Add handlers for other migrations here
            raise HTTPException(
                status_code=501,
                detail=f"Data import not implemented for {migration_id}",
            )

        return result

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Data import failed: {str(e)}"
        )


@router.get("/status")
async def migration_status(db: AsyncSession = Depends(get_db)):
    """Check which migrations have been applied"""
    status = {}

    for migration_id, migration in MIGRATIONS.items():
        try:
            # Check if the main table for this migration exists
            table_name = _get_table_name_for_migration(migration_id)
            if table_name:
                result = await db.execute(
                    text(
                        f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = '{table_name}'
                    )
                """
                    )
                )
                table_exists = result.scalar()

                if table_exists:
                    # Get row count
                    count_result = await db.execute(
                        text(f"SELECT COUNT(*) FROM {table_name}")
                    )
                    row_count = count_result.scalar()
                    status[migration_id] = {
                        "applied": True,
                        "row_count": row_count,
                        "description": migration["description"],
                    }
                else:
                    status[migration_id] = {
                        "applied": False,
                        "description": migration["description"],
                    }
            else:
                status[migration_id] = {
                    "applied": "unknown",
                    "description": migration["description"],
                }

        except Exception as e:
            status[migration_id] = {
                "applied": "error",
                "error": str(e),
                "description": migration["description"],
            }

    return {"migration_status": status}


async def _import_population_density_data(
    data_file: Path, db: AsyncSession
) -> Dict:
    """Import population density data from GeoJSON"""
    logger.info(f"Loading population density data from: {data_file}")

    with open(data_file, "r", encoding="utf-8") as f:
        geojson_data = json.load(f)

    features = geojson_data.get("features", [])
    if not features:
        return {"status": "error", "message": "No features found in GeoJSON"}

    # Clear existing data
    await db.execute(text("DELETE FROM pop_density_by_country_2022_num"))

    success_count = 0
    error_count = 0

    for feature in features:
        try:
            properties = feature.get("properties", {})
            geometry = feature.get("geometry")

            if not geometry:
                error_count += 1
                continue

            name = properties.get("NAME")
            iso_a3 = properties.get("ISO_A3")
            pop_density = properties.get("pop_density_2022_num")

            # Convert geometry to JSON string for PostGIS
            geom_json = json.dumps(geometry)

            query = text(
                """
                INSERT INTO pop_density_by_country_2022_num (
                    "NAME", "ISO_A3", pop_density_2022_num, geom
                ) VALUES (
                    :name, :iso_a3, :pop_density,
                    ST_GeomFromGeoJSON(:geom_json)
                )
            """
            )

            await db.execute(
                query,
                {
                    "name": name,
                    "iso_a3": iso_a3,
                    "pop_density": pop_density,
                    "geom_json": geom_json,
                },
            )

            success_count += 1

        except Exception as e:
            error_count += 1
            logger.error(f"Failed to import feature: {e}")

    await db.commit()

    # Get statistics
    result = await db.execute(
        text(
            """
        SELECT
            COUNT(*) as total,
            MIN(pop_density_2022_num) as min_density,
            MAX(pop_density_2022_num) as max_density,
            AVG(pop_density_2022_num) as avg_density
        FROM pop_density_by_country_2022_num
        WHERE pop_density_2022_num IS NOT NULL
    """
        )
    )

    row = result.fetchone()
    stats = {
        "total_countries": row[0] if row else 0,
        "min_density": float(row[1]) if row and row[1] else None,
        "max_density": float(row[2]) if row and row[2] else None,
        "avg_density": float(row[3]) if row and row[3] else None,
    }

    return {
        "status": "success",
        "message": f"Imported {success_count} countries, {error_count} errors",
        "success_count": success_count,
        "error_count": error_count,
        "statistics": stats,
        "file_used": str(data_file),
    }


def _get_table_name_for_migration(migration_id: str) -> Optional[str]:
    """Get the main table name for a migration for status checking"""
    table_mapping = {
        "0001_create_feature_table": "features",
        "0003_create_analytics_tables": "analytics_sessions",
        "0004_add_population_density_2022": "pop_density_by_country_2022_num",
        "0005_add_climate_data": "climate_data",
    }
    return table_mapping.get(migration_id)
