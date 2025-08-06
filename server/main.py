import base64
import os
import secrets
from contextlib import asynccontextmanager
from typing import Tuple

import uvicorn
from config import settings
from database import init_db
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from routes import feature, health


def verify_basic_auth(credentials: str) -> bool:
    """Verify basic auth credentials."""
    try:
        # Decode base64 credentials
        decoded = base64.b64decode(credentials).decode("utf-8")
        username, password = decoded.split(":", 1)

        # Get credentials from environment
        valid_username = os.getenv("BASIC_AUTH_USERNAME")
        valid_password = os.getenv("BASIC_AUTH_PASSWORD")

        if not valid_username or not valid_password:
            return False

        return username == valid_username and password == valid_password
    except Exception:
        return False


async def basic_auth_middleware(request: Request, call_next):
    """Basic auth middleware that protects main routes in production."""

    # Skip auth in development
    if settings.environment == "development":
        return await call_next(request)

    # Skip auth for health check
    if request.url.path == "/api/v1/health":
        return await call_next(request)

    # Skip auth for static assets to improve performance
    static_paths = [
        "/images/",
        "/cesium/",
        "/data/",
        "/_app/",
        "/assets/",
        "/static/",
        "favicon.ico",
        "robots.txt",
    ]
    
    # Skip auth for static files with common extensions
    static_extensions = [
        ".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg",
        ".ico", ".woff", ".woff2", ".ttf", ".eot", ".map",
        ".json", ".xml", ".txt", ".html", ".htm", ".webp",
        ".wasm", ".glb", ".gltf"
    ]
    
    path = request.url.path.lower()
    
    # Skip auth for static paths
    if any(path.startswith(static_path) for static_path in static_paths):
        return await call_next(request)
    
    # Skip auth for files with static extensions
    if any(path.endswith(ext) for ext in static_extensions):
        return await call_next(request)

    # Only authenticate for main content requests
    # Check for authorization header
    auth_header = request.headers.get("authorization")

    if not auth_header or not auth_header.startswith("Basic "):
        return HTMLResponse(
            content="""
            <!DOCTYPE html>
            <html>
                <head><title>Authentication Required</title></head>
                <body>
                    <h1>Authentication Required</h1>
                    <p>Please provide valid credentials to access site.</p>
                </body>
            </html>
            """,
            status_code=401,
            headers={"WWW-Authenticate": 'Basic realm="Maapallo Info"'},
        )

    # Verify credentials
    credentials = auth_header[6:]  # Remove "Basic " prefix
    if not verify_basic_auth(credentials):
        return HTMLResponse(
            content="""
            <!DOCTYPE html>
            <html>
                <head><title>Authentication Failed</title></head>
                <body>
                    <h1>Authentication Failed</h1>
                    <p>Invalid credentials. Please try again.</p>
                </body>
            </html>
            """,
            status_code=401,
            headers={"WWW-Authenticate": 'Basic realm="Maapallo Info"'},
        )

    # Authentication successful, proceed with request
    return await call_next(request)


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

# Add basic auth middleware (MUST BE FIRST)
app.middleware("http")(basic_auth_middleware)

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
        app.mount(
            "/", StaticFiles(directory=static_dir, html=True), name="static"
        )


# Simple health check for root path (API only)
@app.get("/api")
async def root():
    return {"message": "Maapallo Info API is running", "version": "1.0.0"}


if __name__ == "__main__":
    import os

    # Use PORT environment variable if available
    # (Azure App Service requirement)
    port = int(os.getenv("PORT", settings.server_port))

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True if settings.environment == "development" else False,
    )
