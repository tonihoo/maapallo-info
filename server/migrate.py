"""
Database migration utilities for the FastAPI server.
"""

import asyncio
import logging
from pathlib import Path

from sqlalchemy import text

from database import async_session_maker

logger = logging.getLogger(__name__)


async def run_migration_file(filepath: str) -> bool:
    """Run a single SQL migration file"""
    try:
        migration_path = Path(__file__).parent / "migrations" / filepath

        if not migration_path.exists():
            logger.error(f"Migration file not found: {filepath}")
            return False

        with open(migration_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        async with async_session_maker() as session:
            # Split on semicolons and execute each statement separately
            statements = [
                stmt.strip() for stmt in sql_content.split(";") if stmt.strip()
            ]

            for statement in statements:
                if statement:
                    logger.info(f"Executing: {statement[:100]}...")
                    await session.execute(text(statement))

            await session.commit()

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


if __name__ == "__main__":
    # Allow running migrations directly
    asyncio.run(run_all_migrations())
