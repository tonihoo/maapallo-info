#!/usr/bin/env python3
"""
Simple migration runner for the FastAPI server.
Usage: python run_migrations.py
"""

import asyncio
import sys

from migrate import run_all_migrations


async def main():
    print("Running database migrations...")
    try:
        success = await run_all_migrations()
        if success:
            print("✅ All migrations completed successfully!")
            return 0
        else:
            print("❌ Some migrations failed!")
            return 1
    except Exception as e:
        print(f"❌ Migration failed with error: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
