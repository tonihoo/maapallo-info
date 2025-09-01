import logging
import os

from config import settings
from geoalchemy2 import Geometry
from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.log_level == "debug",
    pool_pre_ping=True,
    # Tuning for cloud platforms (reduce stale connections & bursts)
    pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "300")),  # seconds
    pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
    pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),  # seconds
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


class Feature(Base):
    __tablename__ = "feature"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    author = Column(String, nullable=False)
    thumbnail = Column(Text, nullable=True)
    excerpt = Column(Text, nullable=False)
    publication = Column(String, nullable=False)
    link = Column(Text, nullable=False)
    location = Column(Geometry("GEOMETRY", srid=4326), nullable=False)


async def get_db():
    """Dependency to get database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def check_db_connection():
    """Check database connection for health endpoint"""
    try:
        from sqlalchemy import text

        async with async_session_maker() as session:
            result = await session.execute(text("SELECT 'pong'"))
            return result.scalar() == "pong"
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return False


async def init_db():
    """Initialize database - run migrations if needed"""
    try:
        # For now, just check connection
        # In production, you might want to run Alembic migrations here
        async with async_session_maker() as session:
            from sqlalchemy import text

            await session.execute(text("SELECT 1"))
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
