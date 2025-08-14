"""
GeoServer integration routes for Maapallo.info
Provides layer management and configuration endpoints
"""

import logging
import os
from typing import Dict, List

import requests
from fastapi import APIRouter, HTTPException

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/geoserver", tags=["geoserver"])

# GeoServer configuration
# In production, GeoServer runs in the same container
# In development, GeoServer runs in a separate container
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "production":
    GEOSERVER_URL = os.getenv("GEOSERVER_URL", "http://localhost:8080/geoserver")
else:
    GEOSERVER_URL = os.getenv("GEOSERVER_URL", "http://geoserver:8080/geoserver")

GEOSERVER_USER = os.getenv("GEOSERVER_ADMIN_USER", "admin")
GEOSERVER_PASS = os.getenv("GEOSERVER_ADMIN_PASSWORD", "geoserver")


class GeoServerService:
    """Service class for GeoServer operations"""

    @staticmethod
    def get_auth():
        return (GEOSERVER_USER, GEOSERVER_PASS)

    @staticmethod
    def make_request(endpoint: str, method: str = "GET", **kwargs):
        """Make authenticated request to GeoServer REST API"""
        url = f"{GEOSERVER_URL}/rest/{endpoint}"
        try:
            response = requests.request(
                method=method,
                url=url,
                auth=GeoServerService.get_auth(),
                headers={"Accept": "application/json"},
                timeout=30,
                **kwargs,
            )
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"GeoServer request failed: {e}")
            raise HTTPException(
                status_code=500, detail=f"GeoServer error: {str(e)}"
            )


@router.get("/health")
async def check_geoserver_health():
    """Check if GeoServer is running and accessible"""
    try:
        response = GeoServerService.make_request("about/version")
        return {
            "status": "healthy",
            "geoserver_url": f"{GEOSERVER_URL}/web/",
            "version": response.json(),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "geoserver_url": f"{GEOSERVER_URL}/web/",
        }


@router.get("/config")
async def get_geoserver_config():
    """Get GeoServer configuration for frontend"""
    return {
        "wms_url": f"{GEOSERVER_URL}/wms",
        "wfs_url": f"{GEOSERVER_URL}/wfs",
        "admin_url": f"{GEOSERVER_URL}/web/",
        "rest_url": f"{GEOSERVER_URL}/rest",
    }


@router.get("/workspaces")
async def get_workspaces() -> List[Dict]:
    """Get all GeoServer workspaces"""
    try:
        response = GeoServerService.make_request("workspaces")
        workspaces_data = response.json()

        if "workspaces" in workspaces_data and workspaces_data["workspaces"]:
            workspaces = workspaces_data["workspaces"]["workspace"]
            # Ensure workspaces is always a list
            if isinstance(workspaces, dict):
                workspaces = [workspaces]
            return workspaces
        return []
    except Exception as e:
        logger.error(f"Failed to fetch workspaces: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch workspaces"
        )


@router.get("/layers")
async def get_available_layers() -> List[Dict]:
    """Get all available layers from all workspaces with metadata"""
    try:
        workspaces = await get_workspaces()
        all_layers = []

        for workspace in workspaces:
            ws_name = workspace["name"]

            try:
                # Get layers for this workspace
                response = GeoServerService.make_request(
                    f"workspaces/{ws_name}/layers"
                )
                layers_data = response.json()

                if "layers" in layers_data and layers_data["layers"]:
                    ws_layers = layers_data["layers"]["layer"]
                    # Ensure layers is always a list
                    if isinstance(ws_layers, dict):
                        ws_layers = [ws_layers]

                    for layer in ws_layers:
                        # Determine category based on layer name
                        category = _determine_layer_category(layer["name"])

                        layer_info = {
                            "id": f"{ws_name}:{layer['name']}",
                            "name": layer["name"],
                            "workspace": ws_name,
                            "title": layer.get("title", layer["name"]),
                            "type": "WMS",  # Default to WMS
                            "category": category,
                            "visible": False,
                            "wms_url": f"{GEOSERVER_URL}/wms",
                            "wfs_url": f"{GEOSERVER_URL}/wfs",
                        }
                        all_layers.append(layer_info)

            except Exception as e:
                logger.warning(
                    f"Failed to fetch layers for workspace {ws_name}: {e}"
                )
                continue

        return all_layers

    except Exception as e:
        logger.error(f"Failed to fetch layers: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch layers")


def _determine_layer_category(layer_name: str) -> str:
    """Categorize layers based on naming conventions"""
    layer_lower = layer_name.lower()

    if any(
        word in layer_lower
        for word in ["boundary", "border", "admin", "country", "region"]
    ):
        return "boundaries"
    elif any(
        word in layer_lower
        for word in ["ocean", "water", "climate", "environment", "weather"]
    ):
        return "environmental"
    elif any(
        word in layer_lower
        for word in ["article", "location", "point", "place", "magazine"]
    ):
        return "articles"
    elif any(
        word in layer_lower
        for word in [
            "transport",
            "road",
            "railway",
            "airport",
            "infrastructure",
        ]
    ):
        return "transportation"
    elif any(
        word in layer_lower
        for word in ["population", "demographic", "city", "urban"]
    ):
        return "demographic"
    else:
        return "other"


@router.post("/workspace")
async def create_workspace(workspace_name: str):
    """Create a new workspace in GeoServer"""
    try:
        workspace_data = {"workspace": {"name": workspace_name}}

        response = GeoServerService.make_request(
            "workspaces",
            method="POST",
            json=workspace_data,
            headers={"Content-Type": "application/json"},
        )

        return {
            "message": f"Workspace '{workspace_name}' created successfully"
        }

    except Exception as e:
        logger.error(f"Failed to create workspace: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create workspace: {str(e)}"
        )


@router.get("/layers/{workspace}/{layer_name}/preview")
async def get_layer_preview_url(workspace: str, layer_name: str):
    """Get preview URL for a specific layer"""
    return {
        "preview_url": f"{GEOSERVER_URL}/wms/reflect?layers={workspace}:{layer_name}&format=image/png",
        "openlayers_url": f"{GEOSERVER_URL}/{workspace}/wms?service=WMS&version=1.1.0&request=GetMap&layers={workspace}:{layer_name}&styles=&bbox=-180,-90,180,90&width=768&height=384&srs=EPSG:4326&format=image/png",
    }
