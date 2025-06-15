import os
from contextlib import asynccontextmanager

import uvicorn
from config import settings
from database import init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes import feature, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await init_db()
        print("✅ Database connected successfully")
    except Exception as e:
        print(f"⚠️ Database connection failed: {e}")
        print("🔄 Continuing without database...")
    yield
    # Shutdown


app = FastAPI(
    title="Maapallo Info API",
    description="API for Maapallo Info application",
    version="1.0.0",
    lifespan=lifespan,
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
app.include_router(feature.router, prefix="/api/v1/feature", tags=["features"])

# Serve static files in production
if settings.is_production:
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    if os.path.exists(static_dir):
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


# Simple health check for root path (API only)
@app.get("/api")
async def root():
    return {"message": "Maapallo Info API is running", "version": "1.0.0"}


if __name__ == "__main__":
    import os

    # Use PORT environment variable if available (Azure App Service requirement)
    port = int(os.getenv("PORT", settings.server_port))

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True if settings.environment == "development" else False,
    )
