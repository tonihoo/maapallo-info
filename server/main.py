import base64
import os
import secrets
from contextlib import asynccontextmanager
from typing import Tuple

import httpx
import uvicorn
from config import settings
from database import init_db
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from routes import feature, geoserver, health


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


async def simple_auth_middleware(request: Request, call_next):
    """Lightweight auth middleware to prevent search engine indexing."""

    # Skip auth in development
    if settings.environment == "development":
        return await call_next(request)

    # Debug logging for production
    print(f"🔍 Auth middleware - Path: {request.url.path}")
    print(f"🔍 Environment: {settings.environment}")
    
    # Check if environment variables are set
    valid_username = os.getenv("BASIC_AUTH_USERNAME")
    valid_password = os.getenv("BASIC_AUTH_PASSWORD")
    print(f"🔍 Auth env vars - Username set: {bool(valid_username)}, "
          f"Password set: {bool(valid_password)}")
    
    # Only protect the main page and HTML routes
    path = request.url.path

    # Skip auth for all API routes, static assets, health checks, and geoserver
    if (
        path.startswith("/api/")
        or path.startswith("/geoserver/")
        or path.startswith("/images/")
        or path.startswith("/cesium/")
        or path.startswith("/data/")
        or path.startswith("/static/")
        or "." in path.split("/")[-1]
    ):  # Has file extension
        return await call_next(request)

    # Only authenticate for main HTML page requests
    if request.headers.get("accept", "").startswith("text/html"):
        auth_header = request.headers.get("authorization")

        if not auth_header or not auth_header.startswith("Basic "):
            return HTMLResponse(
                content="""<!DOCTYPE html>
<html><head><title>Authentication Required</title></head>
<body><h1>Authentication Required</h1>
<p>Please provide credentials to access this site.</p></body></html>""",
                status_code=401,
                headers={"WWW-Authenticate": 'Basic realm="Maapallo Info"'},
            )

        # Quick credential check
        try:
            credentials = auth_header[6:]
            decoded = base64.b64decode(credentials).decode("utf-8")
            username, password = decoded.split(":", 1)

            valid_username = os.getenv("BASIC_AUTH_USERNAME")
            valid_password = os.getenv("BASIC_AUTH_PASSWORD")
            
            print(f"🔍 Auth attempt - User: {username}, "
                  f"Valid: {valid_username}")
            print(f"🔍 Password match: {password == valid_password}")

            if username != valid_username or password != valid_password:
                print("❌ Auth failed - invalid credentials")
                return HTMLResponse(
                    content="""<!DOCTYPE html>
<html><head><title>Invalid Credentials</title></head>
<body><h1>Invalid Credentials</h1></body></html>""",
                    status_code=401,
                    headers={
                        "WWW-Authenticate": 'Basic realm="Maapallo Info"'
                    },
                )
            
            print("✅ Auth successful")
        except Exception as e:
            print(f"❌ Auth exception: {str(e)}")
            return HTMLResponse(
                content="""<!DOCTYPE html>
<html><head><title>Authentication Error</title></head>
<body><h1>Authentication Error</h1></body></html>""",
                status_code=401,
                headers={"WWW-Authenticate": 'Basic realm="Maapallo Info"'},
            )

    # Authentication successful or not needed, proceed
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

# Add simple auth middleware (MUST BE FIRST)
app.middleware("http")(simple_auth_middleware)

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
app.include_router(geoserver.router, prefix="/api/v1", tags=["geoserver"])

# GeoServer reverse proxy (only in production)
if settings.is_production:

    @app.api_route(
        "/geoserver/{path:path}",
        methods=["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"],
    )
    async def geoserver_proxy(request: Request, path: str):
        """Reverse proxy for GeoServer running on port 8081"""
        geoserver_url = f"http://localhost:8081/geoserver/{path}"

        # Forward query parameters
        if request.url.query:
            geoserver_url += f"?{request.url.query}"

        async with httpx.AsyncClient() as client:
            # Forward the request
            response = await client.request(
                method=request.method,
                url=geoserver_url,
                headers=dict(request.headers),
                content=await request.body(),
                timeout=30.0,
            )

            # Return the response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
            )


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


# Robots.txt to prevent search engine indexing
@app.get("/robots.txt")
async def robots_txt():
    return HTMLResponse(
        content="User-agent: *\nDisallow: /\n", media_type="text/plain"
    )


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
