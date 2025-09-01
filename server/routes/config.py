import os
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/config", tags=["config"])


@router.get("/public")
async def get_public_config():
    """Return non-sensitive runtime config to the client.

    Cesium Ion token is safe to expose to clients (it's required there).
    """
    return {
        "cesiumIonToken": os.getenv("CESIUM_ION_TOKEN", ""),
    }
