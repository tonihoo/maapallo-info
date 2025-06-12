from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
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
app.include_router(feature.router, prefix="/api/v1/feature", tags=["features"])

# Simple health check for root path
@app.get("/")
async def root():
    return {"message": "Maapallo Info API is running", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.server_port,
        reload=True if settings.environment == "development" else False
    )
