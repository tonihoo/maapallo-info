"""
Database migration utilities for the FastAPI server.
"""

import asyncio
import logging
from pathlib import Path

from config import settings
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

logger = logging.getLogger(__name__)


async def run_migration_file(filepath: str) -> bool:
    """Run a single SQL migration file using explicit async engine"""
    try:
        migration_path = Path(__file__).parent / "migrations" / filepath

        if not migration_path.exists():
            logger.error(f"Migration file not found: {filepath}")
            return False

        with open(migration_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        # Create explicit async engine with debug info
        database_url = settings.database_url
        logger.info(f"Using database URL: {database_url}")

        engine = create_async_engine(database_url, echo=True)

        async with engine.begin() as conn:
            # Split on semicolons and execute each statement separately
            statements = [
                stmt.strip() for stmt in sql_content.split(";") if stmt.strip()
            ]

            for statement in statements:
                if statement:
                    logger.info(f"Executing: {statement[:100]}...")
                    await conn.execute(text(statement))

        await engine.dispose()
        logger.info(f"Successfully ran migration: {filepath}")
        return True

    except Exception as e:
        logger.error(f"Failed to run migration {filepath}: {e}")
        return False


async def run_all_migrations():
    """Run all migration files in order"""
    migration_files = ["0001_create_feature_table.sql", "0002_add_test_data.sql"]

    success_count = 0
    for migration_file in migration_files:
        if await run_migration_file(migration_file):
            success_count += 1
        else:
            logger.error(f"Migration failed: {migration_file}")
            break

    logger.info(f"Completed {success_count}/{len(migration_files)} migrations")
    return success_count == len(migration_files)


async def reset_database():
    """Reset database by running all migrations from scratch"""
    logger.info("Resetting database...")
    return await run_all_migrations()


async def drop_all_tables():
    """Drop all tables and extensions in the database"""
    try:
        logger.info("🔥 Dropping all tables and extensions...")

        async with engine.begin() as conn:
            # Drop tables in correct order (features first, then spatial tables)
            await conn.execute(text("DROP TABLE IF EXISTS feature CASCADE;"))
            await conn.execute(text("DROP TABLE IF EXISTS spatial_ref_sys CASCADE;"))
            await conn.execute(text("DROP EXTENSION IF EXISTS postgis CASCADE;"))

        logger.info("✅ Successfully dropped all tables and extensions")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to drop tables: {e}")
        return False


async def reset_production_database():
    """Complete database reset for production"""
    logger.info("🔥 RESETTING PRODUCTION DATABASE...")
    if await drop_all_tables():
        logger.info("✅ Tables dropped, running migrations...")
        return await run_all_migrations()
    return False


if __name__ == "__main__":
    # Allow running migrations directly
    asyncio.run(run_all_migrations())
