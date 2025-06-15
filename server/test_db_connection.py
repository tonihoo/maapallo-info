#!/usr/bin/env python3

import asyncio

from config import settings


async def test_database_connection():
    """Test database connection with debug output"""
    
    print("=== Database Configuration Debug ===")
    print(f"Environment: {settings.environment}")
    print(f"PG_HOST: {settings.pg_host}")
    print(f"PG_USER: {settings.pg_user}")
    print(f"PG_DATABASE: {settings.pg_database}")
    print(f"PG_SSLMODE: {settings.pg_sslmode}")
    print(f"PG_PORT: {settings.pg_port}")
    print()
    
    print("=== Generated Database URLs ===")
    print(f"Async URL: {settings.database_url}")
    print(f"Sync URL: {settings.database_url_sync}")
    print()
    
    # Test async connection
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        print("Testing async connection...")
        engine = create_async_engine(settings.database_url, echo=True)
        
        async with engine.begin() as conn:
            result = await conn.execute("SELECT 1 as test")
            row = result.fetchone()
            print(f"✅ Async connection successful: {row}")
        
        await engine.dispose()
        
    except Exception as e:
        print(f"❌ Async connection failed: {e}")
    
    # Test sync connection  
    try:
        from sqlalchemy import create_engine
        print("Testing sync connection...")
        sync_engine = create_engine(settings.database_url_sync, echo=True)
        
        with sync_engine.begin() as conn:
            result = conn.execute("SELECT 1 as test")
            row = result.fetchone()
            print(f"✅ Sync connection successful: {row}")
        
        sync_engine.dispose()
        
    except Exception as e:
        print(f"❌ Sync connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_database_connection())
