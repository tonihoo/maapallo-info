"""Enhanced Admin API with GeoServer Configuration Persistence.

This module extends the existing admin functionality to integrate with
the GeoServer configuration persistence system.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from auth import require_auth
from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from services.geoserver_config import GeoServerConfigService
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/admin/geoserver", tags=["geoserver-config"])
logger = logging.getLogger(__name__)


async def get_config_service(db: AsyncSession = Depends(get_db)):
    """Dependency to get GeoServer configuration service."""
    return GeoServerConfigService(db)


@router.post("/setup-default")
async def setup_default_configuration(
    current_user: dict = Depends(require_auth),
    config_service: GeoServerConfigService = Depends(get_config_service),
):
    """Set up default workspace and datastore configuration."""
    try:
        await config_service.setup_default_configuration()
        return {"message": "Default configuration setup completed"}
    except Exception as e:
        logger.error(f"Failed to setup default configuration: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to setup default configuration: {e}",
        )


@router.post("/workspaces")
async def register_workspace(
    name: str,
    description: Optional[str] = None,
    current_user: dict = Depends(require_auth),
    config_service: GeoServerConfigService = Depends(get_config_service),
):
    """Register a workspace in the configuration database."""
    try:
        await config_service.register_workspace(name, description)
        return {"message": f"Workspace '{name}' registered successfully"}
    except Exception as e:
        logger.error(f"Failed to register workspace: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to register workspace: {e}"
        )


@router.post("/datastores")
async def register_datastore(
    workspace_name: str,
    datastore_name: str,
    datastore_type: str = "postgis",
    connection_params: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(require_auth),
    config_service: GeoServerConfigService = Depends(get_config_service),
):
    """Register a datastore in the configuration database."""
    try:
        await config_service.register_datastore(
            workspace_name, datastore_name, datastore_type, connection_params
        )
        return {
            "message": f"Datastore '{datastore_name}' registered successfully"
        }
    except Exception as e:
        logger.error(f"Failed to register datastore: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to register datastore: {e}"
        )


@router.post("/layers")
async def register_layer(
    workspace_name: str,
    datastore_name: str,
    layer_name: str,
    table_name: str,
    geom_column: str = "geom",
    srid: Optional[int] = None,
    layer_config: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(require_auth),
    config_service: GeoServerConfigService = Depends(get_config_service),
):
    """Register a layer in the configuration database."""
    try:
        await config_service.register_layer(
            workspace_name,
            datastore_name,
            layer_name,
            table_name,
            geom_column,
            srid,
            layer_config,
        )
        return {"message": f"Layer '{layer_name}' registered successfully"}
    except Exception as e:
        logger.error(f"Failed to register layer: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to register layer: {e}"
        )


@router.get("/configuration")
async def get_configuration(
    current_user: dict = Depends(require_auth),
    config_service: GeoServerConfigService = Depends(get_config_service),
):
    """Get the complete GeoServer configuration from database."""
    try:
        config = await config_service.get_full_configuration()
        return {"configuration": config}
    except Exception as e:
        logger.error(f"Failed to get configuration: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get configuration: {e}"
        )


@router.get("/layers")
async def get_registered_layers(
    current_user: dict = Depends(require_auth),
    config_service: GeoServerConfigService = Depends(get_config_service),
):
    """Get all registered layers."""
    try:
        layers = await config_service.get_registered_layers()
        return {"layers": layers}
    except Exception as e:
        logger.error(f"Failed to get registered layers: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get registered layers: {e}"
        )


# Enhanced layer registration that combines existing functionality
@router.post("/layers/auto-register")
async def auto_register_layer_from_table(
    table_name: str,
    workspace_name: str = "maapallo",
    datastore_name: str = "postgis",
    layer_name: Optional[str] = None,
    current_user: dict = Depends(require_auth),
    config_service: GeoServerConfigService = Depends(get_config_service),
    db: AsyncSession = Depends(get_db),
):
    """Auto-register a layer from an existing PostGIS table.

    This endpoint:
    1. Checks if the table exists and has geometry
    2. Automatically detects geometry column and SRID
    3. Registers in the persistence database
    4. Creates the layer in GeoServer (via existing admin functions)
    """
    try:
        # Import the existing admin functions
        from routes.admin import (
            create_geoserver_layer,
            ensure_datastore_exists,
            ensure_workspace_exists,
        )

        if not layer_name:
            layer_name = table_name

        # Check if table exists and get geometry info
        result = await db.execute(
            text(
                """
                SELECT
                    g.f_geometry_column as geom_column,
                    g.srid,
                    g.type as geom_type
                FROM information_schema.tables t
                JOIN geometry_columns g ON t.table_name = g.f_table_name
                WHERE t.table_schema = 'public'
                AND t.table_name = :table_name
                AND t.table_type = 'BASE TABLE'
            """
            ),
            {"table_name": table_name},
        )
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"Table '{table_name}' not found or has no geometry",
            )

        geom_column = row.geom_column
        srid = row.srid
        geom_type = row.geom_type

        # Ensure workspace and datastore exist in GeoServer
        await ensure_workspace_exists()
        actual_datastore = await ensure_datastore_exists()

        # Register in persistence database
        await config_service.register_layer(
            workspace_name=workspace_name,
            datastore_name=actual_datastore,
            layer_name=layer_name,
            table_name=table_name,
            geom_column=geom_column,
            srid=srid,
            layer_config={
                "geometry_type": geom_type,
                "auto_registered": True,
                "registered_at": datetime.now().isoformat(),
            },
        )

        # Create layer in GeoServer
        await create_geoserver_layer(table_name, actual_datastore)

        return {
            "message": f"Layer '{layer_name}' auto-registered successfully",
            "details": {
                "table_name": table_name,
                "layer_name": layer_name,
                "workspace": workspace_name,
                "datastore": actual_datastore,
                "geometry_column": geom_column,
                "srid": srid,
                "geometry_type": geom_type,
            },
        }

    except Exception as e:
        logger.error(
            f"Failed to auto-register layer from table {table_name}: {e}"
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to auto-register layer: {e}"
        )


@router.get("/tables/available")
async def get_available_tables(
    current_user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get all tables with geometry columns that could be used as layers."""
    try:
        result = await db.execute(
            text(
                """
                SELECT
                    t.table_name,
                    g.f_geometry_column as geom_column,
                    g.srid,
                    g.type as geom_type,
                    (SELECT COUNT(*) FROM information_schema.columns
                     WHERE table_name = t.table_name
                     AND table_schema = 'public') as column_count
                FROM information_schema.tables t
                JOIN geometry_columns g ON t.table_name = g.f_table_name
                WHERE t.table_schema = 'public'
                AND t.table_type = 'BASE TABLE'
                AND t.table_name NOT LIKE 'spatial_%'
                AND t.table_name NOT LIKE 'geoserver_%'
                ORDER BY t.table_name
            """
            )
        )
        rows = result.fetchall()

        tables = []
        for row in rows:
            tables.append(
                {
                    "table_name": row.table_name,
                    "geom_column": row.geom_column,
                    "srid": row.srid,
                    "geom_type": row.geom_type,
                    "column_count": row.column_count,
                }
            )

        return {"available_tables": tables}

    except Exception as e:
        logger.error(f"Failed to get available tables: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get available tables: {e}"
        )
