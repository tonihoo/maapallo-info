"""
Import population density data from QGIS-exported GeoJSON
This script loads the data into your production database
"""

import asyncio
import json
import logging
from pathlib import Path

from shapely.geometry import shape
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def import_population_data():
    """Import population density data from GeoJSON file"""

    # Use the same database configuration as the main app
    from config import settings

    engine = create_async_engine(settings.database_url, echo=False)

    # Load GeoJSON data from the file we copied to the container
    geojson_path = Path("/app/pop_density_data.geojson")

    if not geojson_path.exists():
        logger.error("GeoJSON file not found at expected location")
        logger.info("Please copy the GeoJSON file to the container")
        logger.info("Expected file: /app/pop_density_data.geojson")
        return

    logger.info(f"Loading data from: {geojson_path}")

    try:
        with open(geojson_path, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)
    except Exception as e:
        logger.error(f"Failed to load GeoJSON: {e}")
        return

    # Process features
    features = geojson_data.get("features", [])
    logger.info(f"Found {len(features)} features to import")

    if not features:
        logger.warning("No features found in GeoJSON")
        return

    async with engine.begin() as conn:
        # Clear existing data (optional - remove to keep existing data)
        logger.info("Clearing existing population density data...")
        await conn.execute(text("DELETE FROM pop_density_by_country_2022_num"))

        # Import new data
        success_count = 0
        error_count = 0

        for feature in features:
            try:
                properties = feature.get("properties", {})
                geometry = feature.get("geometry")

                if not geometry:
                    country_name = properties.get("NAME", "Unknown")
                    logger.warning(
                        f"Skipping feature without geometry: {country_name}"
                    )
                    error_count += 1
                    continue

                # Extract properties
                name = properties.get("NAME")
                iso_a3 = properties.get("ISO_A3")
                pop_density = properties.get("pop_density_2022_num")

                # Convert geometry to WKT for PostGIS
                shapely_geom = shape(geometry)
                geom_wkt = shapely_geom.wkt

                # Insert into database
                query = text(
                    """
                    INSERT INTO pop_density_by_country_2022_num (
                        "NAME", "ISO_A3", pop_density_2022_num, geom
                    ) VALUES (
                        :name, :iso_a3, :pop_density,
                        ST_GeomFromText(:geom_wkt, 4326)
                    )
                """
                )

                await conn.execute(
                    query,
                    {
                        "name": name,
                        "iso_a3": iso_a3,
                        "pop_density": pop_density,
                        "geom_wkt": geom_wkt,
                    },
                )

                success_count += 1

                if success_count % 50 == 0:
                    logger.info(f"Imported {success_count} countries...")

            except Exception as e:
                error_count += 1
                country_name = properties.get("NAME", "Unknown")
                logger.error(f"Failed to import {country_name}: {e}")
                continue

    logger.info(
        f"Import completed: {success_count} successful, {error_count} errors"
    )

    # Verify the import
    async with engine.begin() as conn:
        result = await conn.execute(
            text(
                """
            SELECT
                COUNT(*) as total_countries,
                COUNT(pop_density_2022_num) as countries_with_data,
                MIN(pop_density_2022_num) as min_density,
                MAX(pop_density_2022_num) as max_density,
                AVG(pop_density_2022_num) as avg_density
            FROM pop_density_by_country_2022_num
        """
            )
        )

        row = result.fetchone()
        if row:
            logger.info("Import verification:")
            logger.info(f"  Total countries: {row[0]}")
            logger.info(f"  Countries with density data: {row[1]}")
            if row[2]:
                logger.info(f"  Min density: {row[2]:.2f}")
            else:
                logger.info("  Min density: None")
            if row[3]:
                logger.info(f"  Max density: {row[3]:.2f}")
            else:
                logger.info("  Max density: None")
            if row[4]:
                logger.info(f"  Avg density: {row[4]:.2f}")
            else:
                logger.info("  Avg density: None")

    await engine.dispose()


if __name__ == "__main__":
    print("🌍 Importing Population Density Data from QGIS")
    print("=" * 50)

    # Update the DATABASE_URL before running
    print("⚠️  Remember to update DATABASE_URL in this script!")
    print("   For local: postgresql+asyncpg://user:pass@localhost:5432/db")
    print("   For Azure: postgresql+asyncpg://user:pass@server.postgres...")
    print()

    asyncio.run(import_population_data())
