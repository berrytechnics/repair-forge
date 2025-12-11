#!/bin/sh
# Production database migration script for Docker deployments
# This script runs all SQL migrations in order

set -e

echo "Starting database migrations..."

# Check if database connection variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
  echo "Error: Database connection variables are not set"
  echo "Required: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
  exit 1
fi

# Install psql if not available (for Docker environment)
if ! command -v psql &> /dev/null; then
  echo "Installing PostgreSQL client..."
  apk add --no-cache postgresql-client || apt-get update && apt-get install -y postgresql-client || echo "Warning: Could not install psql client"
fi

# Set PGPASSWORD environment variable for psql
export PGPASSWORD="$DB_PASSWORD"

# Enable UUID extension (required for migrations)
echo "Enabling UUID extension..."
psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || {
  echo "Warning: Could not enable UUID extension (may already exist)"
}

# Get migration directory (relative to project root)
MIGRATIONS_DIR="/app/../../database/migrations"

# If migrations directory doesn't exist at that path, try alternative paths
if [ ! -d "$MIGRATIONS_DIR" ]; then
  # Try from backend directory
  MIGRATIONS_DIR="./database/migrations"
  if [ ! -d "$MIGRATIONS_DIR" ]; then
    # Try absolute path from backend
    MIGRATIONS_DIR="../database/migrations"
    if [ ! -d "$MIGRATIONS_DIR" ]; then
      echo "Error: Could not find migrations directory"
      exit 1
    fi
  fi
fi

echo "Using migrations directory: $MIGRATIONS_DIR"

# Get all SQL migration files and sort them
MIGRATION_FILES=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATION_FILES" ]; then
  echo "Warning: No SQL migration files found in $MIGRATIONS_DIR"
  exit 0
fi

MIGRATION_COUNT=0

# Run each migration
for migration in $MIGRATION_FILES; do
  echo "========================================="
  echo "Running migration: $(basename "$migration")"
  echo "========================================="

  # Run migration with error handling
  if psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f "$migration" -v ON_ERROR_STOP=1; then
    echo "✓ Migration $(basename "$migration") completed successfully"
    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
  else
    EXIT_CODE=$?
    # Check if it's a "already exists" error (idempotent)
    if psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f "$migration" 2>&1 | grep -q "already exists"; then
      echo "⚠ Migration $(basename "$migration") skipped (already applied)"
      MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    else
      echo "✗ Migration $(basename "$migration") failed with exit code $EXIT_CODE"
      exit 1
    fi
  fi
done

echo ""
echo "Successfully ran $MIGRATION_COUNT migrations"
echo "All migrations completed successfully"

# Unset password
unset PGPASSWORD





