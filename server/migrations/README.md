# Database Migrations

This folder contains SQL migration files for the Maapallo Info database.

## Migration Files

- `0001_create_feature_table.sql` - Creates the main feature table with PostGIS geometry support
- `0002_add_test_data.sql` - Adds sample data for development and testing

## Running Migrations

### Using the Python migration runner:
```bash
# Run all migrations
python migrate.py

# Or run from within the application
from migrate import run_all_migrations
await run_all_migrations()
```

### Manual execution:
```bash
# Connect to database and run manually
docker-compose exec db psql -U db_dev_user -d db_dev

# Then run each SQL file content manually
```

## Database Schema

The feature table structure:
```sql
CREATE TABLE feature (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  thumbnail TEXT,
  excerpt TEXT NOT NULL,
  publication TEXT NOT NULL,
  link TEXT NOT NULL,
  location geometry(GEOMETRY, 3067) NOT NULL
);
```

The `location` field uses PostGIS with SRID 3067 (ETRS-TM35FIN coordinate system for Finland).

## Adding New Migrations

1. Create a new SQL file with incrementing number: `000X_description.sql`
2. Add the filename to the `migration_files` list in `migrate.py`
3. Test the migration in development environment
4. Commit both the SQL file and updated migration runner
