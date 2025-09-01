"""
Simple Population Density API for Maapallo.info
Direct approach without GeoServer complexity
"""

import json

from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/layers", tags=["Layers"])


@router.get("/population-density-2022")
async def get_population_density_2022(
    format: str = "geojson", db: AsyncSession = Depends(get_db)
):
    """
    Get population density data for 2022
    Returns GeoJSON for direct use in OpenLayers/Cesium
    """
    try:
        if format.lower() == "geojson":
            # Return full GeoJSON for mapping
            query = text(
                """
                SELECT jsonb_build_object(
                    'type', 'FeatureCollection',
                    'features', COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'type', 'Feature',
                            'properties', jsonb_build_object(
                                'name', "NAME",
                                'iso_a3', "ISO_A3",
                                'population_density', pop_density_2022_num
                            ),
                            'geometry', ST_AsGeoJSON(geom)::jsonb
                        )
                    ), '[]'::jsonb)
                ) as geojson
                FROM pop_density_by_country_2022_num
                WHERE pop_density_2022_num IS NOT NULL AND geom IS NOT NULL
            """
            )

            result = await db.execute(query)
            data = result.scalar()

            return data

        elif format.lower() == "summary":
            # Return summary statistics
            query = text(
                """
                SELECT
                    COUNT(*) as total_countries,
                    MIN(pop_density_2022_num) as min_density,
                    MAX(pop_density_2022_num) as max_density,
                    AVG(pop_density_2022_num) as avg_density,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (
                        ORDER BY pop_density_2022_num
                    ) as median_density
                FROM pop_density_by_country_2022_num
                WHERE pop_density_2022_num IS NOT NULL
            """
            )

            result = await db.execute(query)
            row = result.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404, detail="No population density data found"
                )

            return {
                "total_countries": row[0],
                "min_density": float(row[1]) if row[1] else None,
                "max_density": float(row[2]) if row[2] else None,
                "avg_density": float(row[3]) if row[3] else None,
                "median_density": float(row[4]) if row[4] else None,
            }

        else:
            raise HTTPException(
                status_code=400, detail="Format must be 'geojson' or 'summary'"
            )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Database error: {str(e)}"
        )


@router.get("/population-density-2022/country/{iso_code}")
async def get_country_population_density(
    iso_code: str, db: AsyncSession = Depends(get_db)
):
    """Get population density for a specific country"""
    try:
        query = text(
            """
            SELECT
                "NAME" as name,
                "ISO_A3" as iso_a3,
                pop_density_2022_num as population_density,
                ST_AsGeoJSON(geom) as geometry
            FROM pop_density_by_country_2022_num
            WHERE "ISO_A3" = :iso_code
        """
        )

        result = await db.execute(query, {"iso_code": iso_code.upper()})
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404, detail=f"Country {iso_code} not found"
            )

        return {
            "name": row[0],
            "iso_a3": row[1],
            "population_density": float(row[2]) if row[2] else None,
            "geometry": json.loads(row[3]) if row[3] else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Database error: {str(e)}"
        )


# Frontend usage example:
FRONTEND_USAGE = """
// In your React component
const PopulationDensityLayer = () => {
    const [layerData, setLayerData] = useState(null);

    useEffect(() => {
        fetch('/api/v1/layers/population-density-2022?format=geojson')
            .then(response => response.json())
            .then(data => {
                setLayerData(data);

                // Add to OpenLayers map
                const vectorSource = new VectorSource({
                    features: new GeoJSON().readFeatures(data)
                });

                const vectorLayer = new VectorLayer({
                    source: vectorSource,
                    style: (feature) => {
                        const density = feature.get('population_density');
                        return createPopulationDensityStyle(density);
                    }
                });

                map.addLayer(vectorLayer);
            });
    }, []);

    return <div>Population density layer loaded</div>;
};

// Styling function
const createPopulationDensityStyle = (density) => {
    const getColor = (value) => {
        if (value < 50) return '#ffffcc';
        if (value < 100) return '#c7e9b4';
        if (value < 200) return '#7fcdbb';
        if (value < 500) return '#41b6c4';
        if (value < 1000) return '#2c7fb8';
        return '#253494';
    };

    return new Style({
        fill: new Fill({ color: getColor(density) }),
        stroke: new Stroke({ color: '#666', width: 0.5 })
    });
};
"""
