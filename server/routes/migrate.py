"""
General migration system for Maapallo.info
Handles database schema changes. (Data imports are handled by the Admin API.)
"""

import logging
from typing import Optional

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
    """List all available migrations (schema only)"""
    return {
        "migrations": [
            {
                "id": migration_id,
                "description": migration_data["description"],
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


def _get_table_name_for_migration(migration_id: str) -> Optional[str]:
    """Get the main table name for a migration for status checking"""
    table_mapping = {
        "0001_create_feature_table": "features",
        "0003_create_analytics_tables": "analytics_sessions",
        "0004_add_population_density_2022": "pop_density_by_country_2022_num",
        "0005_add_climate_data": "climate_data",
    }
    return table_mapping.get(migration_id)
