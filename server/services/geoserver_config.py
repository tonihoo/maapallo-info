"""GeoServer Configuration Persistence Service."""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class GeoServerConfigService:
    """Service for managing GeoServer configuration persistence."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def register_workspace(
        self, name: str, description: Optional[str] = None
    ) -> None:
        """Register a workspace in the configuration database."""
        try:
            sql = """
                INSERT INTO geoserver_workspaces
                (name, description, updated_at)
                VALUES (:name, :description, NOW())
                ON CONFLICT (name)
                DO UPDATE SET description = EXCLUDED.description,
                              updated_at = NOW()
            """
            await self.db.execute(
                text(sql), {"name": name, "description": description}
            )
            await self.db.commit()
            logger.info(f"Registered workspace: {name}")
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to register workspace {name}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to register workspace: {e}"
            )

    async def register_datastore(
        self,
        workspace_name: str,
        datastore_name: str,
        datastore_type: str = "postgis",
        connection_params: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Register a datastore in the configuration database."""
        if connection_params is None:
            connection_params = self._get_default_postgis_params()

        try:
            sql = """
                INSERT INTO geoserver_datastores
                (workspace_name, name, type, connection_params, updated_at)
                VALUES (:ws, :name, :type, :params::jsonb, NOW())
                ON CONFLICT (workspace_name, name)
                DO UPDATE SET
                    type = EXCLUDED.type,
                    connection_params = EXCLUDED.connection_params,
                    updated_at = NOW()
            """
            await self.db.execute(
                text(sql),
                {
                    "ws": workspace_name,
                    "name": datastore_name,
                    "type": datastore_type,
                    "params": json.dumps(connection_params),
                },
            )
            await self.db.commit()
            logger.info(
                f"Registered datastore: {workspace_name}:{datastore_name}"
            )
        except Exception as e:
            await self.db.rollback()
            logger.error(
                f"Failed to register datastore {workspace_name}:"
                f"{datastore_name}: {e}"
            )
            raise HTTPException(
                status_code=500, detail=f"Failed to register datastore: {e}"
            )

    async def register_layer(
        self,
        workspace_name: str,
        datastore_name: str,
        layer_name: str,
        table_name: str,
        geom_column: str = "geom",
        srid: Optional[int] = None,
        layer_config: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Register a layer in the configuration database."""
        try:
            await self.db.execute(
                text(
                    """
                    SELECT register_geoserver_layer(
                        :ws, :ds, :layer, :table, :geom, :srid, :config::jsonb
                    )
                """
                ),
                {
                    "ws": workspace_name,
                    "ds": datastore_name,
                    "layer": layer_name,
                    "table": table_name,
                    "geom": geom_column,
                    "srid": srid,
                    "config": (
                        json.dumps(layer_config) if layer_config else None
                    ),
                },
            )
            await self.db.commit()
            logger.info(f"Registered layer: {workspace_name}:{layer_name}")
        except Exception as e:
            await self.db.rollback()
            logger.error(
                f"Failed to register layer {workspace_name}:{layer_name}: {e}"
            )
            raise HTTPException(
                status_code=500, detail=f"Failed to register layer: {e}"
            )

    async def get_full_configuration(self) -> List[Dict[str, Any]]:
        """Get the complete GeoServer configuration from database."""
        try:
            result = await self.db.execute(
                text("SELECT * FROM get_geoserver_configuration()")
            )
            rows = result.fetchall()

            config_data = []
            for row in rows:
                config_data.append(
                    {
                        "workspace_name": row.workspace_name,
                        "workspace_description": row.workspace_description,
                        "datastore_name": row.datastore_name,
                        "datastore_type": row.datastore_type,
                        "datastore_params": row.datastore_params,
                        "layer_name": row.layer_name,
                        "table_name": row.table_name,
                        "geom_column": row.geom_column,
                        "srid": row.srid,
                        "layer_config": row.layer_config,
                    }
                )

            logger.info(f"Retrieved {len(config_data)} configuration entries")
            return config_data

        except Exception as e:
            logger.error(f"Failed to get configuration: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to get configuration: {e}"
            )

    async def get_registered_layers(self) -> List[Dict[str, Any]]:
        """Get all registered layers."""
        try:
            sql = """
                SELECT workspace_name, datastore_name, layer_name,
                       table_name, geom_column, srid, layer_config,
                       created_at, updated_at
                FROM geoserver_layers
                ORDER BY workspace_name, layer_name
            """
            result = await self.db.execute(text(sql))
            rows = result.fetchall()

            layers = []
            for row in rows:
                layers.append(
                    {
                        "workspace_name": row.workspace_name,
                        "datastore_name": row.datastore_name,
                        "layer_name": row.layer_name,
                        "table_name": row.table_name,
                        "geom_column": row.geom_column,
                        "srid": row.srid,
                        "layer_config": row.layer_config,
                        "created_at": row.created_at,
                        "updated_at": row.updated_at,
                    }
                )

            return layers

        except Exception as e:
            logger.error(f"Failed to get registered layers: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to get registered layers: {e}"
            )

    async def setup_default_configuration(self) -> None:
        """Set up default workspace and datastore configuration."""
        try:
            # Register default workspace
            await self.register_workspace(
                "maapallo", "Main workspace for Maapallo GIS layers"
            )

            # Register default PostGIS datastore
            await self.register_datastore(
                "maapallo",
                "postgis",
                "postgis",
                self._get_default_postgis_params(),
            )

            logger.info("Default configuration setup completed")

        except Exception as e:
            logger.error(f"Failed to setup default configuration: {e}")
            raise

    def _get_default_postgis_params(self) -> Dict[str, Any]:
        """Get default PostGIS connection parameters."""
        return {
            "dbtype": "postgis",
            "schema": "public",
            "Loose bbox": True,
            "Estimated extends": False,
            "validate connections": True,
            "Connection timeout": 20,
            "preparedStatements": False,
        }
