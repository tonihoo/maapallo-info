import base64
import os
from contextlib import asynccontextmanager

import uvicorn
from analytics.routes import router as analytics_router
from config import settings
from database import init_db
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from routes import auth, feature, health
from starlette.middleware.gzip import GZipMiddleware


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

    # Fetch credentials only once; avoid noisy logs in production
    valid_username = os.getenv("BASIC_AUTH_USERNAME")
    valid_password = os.getenv("BASIC_AUTH_PASSWORD")

    # Only protect the main page and HTML routes
    path = request.url.path

    # Skip auth for all API routes, static assets, health checks
    if (
        path.startswith("/api/")
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
                headers={"WWW-Authenticate": 'Basic realm="Maapallo.info"'},
            )

        # Quick credential check
        try:
            credentials = auth_header[6:]
            decoded = base64.b64decode(credentials).decode("utf-8")
            username, password = decoded.split(":", 1)

            valid_username = os.getenv("BASIC_AUTH_USERNAME")
            valid_password = os.getenv("BASIC_AUTH_PASSWORD")

            if username != valid_username or password != valid_password:
                return HTMLResponse(
                    content="""<!DOCTYPE html>
<html><head><title>Invalid Credentials</title></head>
<body><h1>Invalid Credentials</h1></body></html>""",
                    status_code=401,
                    headers={
                        "WWW-Authenticate": 'Basic realm="Maapallo.info"'
                    },
                )
        except Exception:
            return HTMLResponse(
                content="""<!DOCTYPE html>
<html><head><title>Authentication Error</title></head>
<body><h1>Authentication Error</h1></body></html>""",
                status_code=401,
                headers={"WWW-Authenticate": 'Basic realm="Maapallo.info"'},
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
    title="Maapallo.info API",
    description="API for Maapallo.info application",
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

# GZip large responses (GeoJSON, static assets, API JSON)
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Add lightweight cache headers for static assets and data


@app.middleware("http")
async def cache_headers_middleware(request: Request, call_next):
    response = await call_next(request)

    path = request.url.path
    # Set strong caching for Cesium engine assets and hashed JS/CSS bundles
    if path.startswith("/cesium/") or path.endswith((".js", ".css")):
        if "cache-control" not in response.headers:
            response.headers["Cache-Control"] = (
                "public, max-age=31536000, immutable"
            )
        return response

    # Shorter cache for data so content updates propagate
    if path.startswith("/data/") or path.endswith((".json", ".geojson")):
        if "cache-control" not in response.headers:
            response.headers["Cache-Control"] = "public, max-age=86400"
    return response


# Include routers
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(feature.router, prefix="/api/v1/feature", tags=["features"])
app.include_router(analytics_router, prefix="/api/v1", tags=["analytics"])
try:
    from routes.config import router as config_router

    app.include_router(config_router)
    print("✅ Config API loaded")
except ImportError as e:
    print(f"⚠️  Config API not available: {e}")

# Add migration router
try:
    from routes.migrate import router as migrate_router

    app.include_router(
        migrate_router, prefix="/api/v1/migrate", tags=["migrations"]
    )
    print("✅ Migration API loaded")
except ImportError as e:
    print(f"⚠️  Migration API not available: {e}")

# Add admin router
try:
    from routes.admin import router as admin_router

    app.include_router(admin_router, tags=["admin"])
    print("✅ Admin API loaded")
except ImportError as e:
    print(f"⚠️  Admin API not available: {e}")

# Add population density API
try:
    from population_density_api import router as population_router

    app.include_router(population_router, tags=["layers"])
    print("✅ Population density API loaded")
except ImportError as e:
    print(f"⚠️  Population density API not available: {e}")
    print("    Run the data import script first")

# Add generic layers router
try:
    from routes.layers import router as layers_router

    app.include_router(layers_router, tags=["layers"])
    print("✅ Generic Layers API loaded")
except ImportError as e:
    print(f"⚠️  Generic Layers API not available: {e}")

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
    return {"message": "Maapallo.info API is running", "version": "1.0.0"}


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
