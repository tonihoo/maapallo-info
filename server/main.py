from fastapi import FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from contextlib import asynccontextmanager

from database import init_db
from routes import health, feature
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="Maapallo Info API",
    description="API for Maapallo Info application",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1/health", tags=["health"])
app.include_router(feature.router, prefix="/api/v1/features", tags=["features"])

# Serve static files
static_path = "/app/static"
if os.path.exists(static_path):
    app.mount("/", StaticFiles(directory=static_path, html=True), name="static")
else:
    # For development
    @app.get("/{full_path:path}")
    async def catch_all(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail=f"{full_path} not found")
        # Return index.html for client-side routing
        return FileResponse("/app/static/index.html")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.server_port,
        reload=True if settings.environment == "development" else False
    )
