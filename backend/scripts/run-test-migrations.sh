#!/bin/bash
# Run database migrations for test database
# Matches the exact logic from GitHub Actions workflow

set -e

DB_HOST="localhost"
DB_PORT="5433"
DB_USER="test_user"
DB_PASSWORD="test_password"
DB_NAME="test_db"
CONTAINER_NAME="repair-tix-test-db"

# Set PGPASSWORD for psql
export PGPASSWORD="${DB_PASSWORD}"

# Get the project root directory (assuming script is in backend/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MIGRATIONS_DIR="${PROJECT_ROOT}/database/migrations"

echo "Running database migrations..."
echo "Migrations directory: ${MIGRATIONS_DIR}"

# Check if migrations directory exists
if [ ! -d "${MIGRATIONS_DIR}" ]; then
  echo "ERROR: Migrations directory not found: ${MIGRATIONS_DIR}"
  exit 1
fi

# Check if psql is available (try docker exec first, then local psql)
USE_DOCKER_PSQL=false
if docker exec "${CONTAINER_NAME}" psql --version > /dev/null 2>&1; then
  USE_DOCKER_PSQL=true
  PSQL_HOST="localhost"
  PSQL_PORT="5432"
  PSQL_USER="${DB_USER}"
  PSQL_DB="${DB_NAME}"
else
  # Try local psql
  if ! command -v psql &> /dev/null; then
    echo "ERROR: psql not found. Please install PostgreSQL client or ensure Docker container is running."
    exit 1
  fi
  USE_DOCKER_PSQL=false
  PSQL_HOST="${DB_HOST}"
  PSQL_PORT="${DB_PORT}"
  PSQL_USER="${DB_USER}"
  PSQL_DB="${DB_NAME}"
fi

# Enable UUID extension (required for migrations)
echo "Enabling UUID extension..."
if [ "${USE_DOCKER_PSQL}" = "true" ]; then
  docker exec -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
    psql -U "${PSQL_USER}" -d "${PSQL_DB}" \
    -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || exit 1
else
  # Use TCP connection explicitly for local psql
  psql "postgresql://${PSQL_USER}:${DB_PASSWORD}@${PSQL_HOST}:${PSQL_PORT}/${PSQL_DB}" \
    -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || exit 1
fi
echo "UUID extension enabled"

# List migration files
echo "Looking for migration files..."
ls -la "${MIGRATIONS_DIR}"/*.sql 2>/dev/null || echo "No SQL migration files found"
ls -la "${MIGRATIONS_DIR}"/*.js 2>/dev/null || echo "No JS migration files found"

# Run all SQL migrations in order first
echo "Running SQL migrations..."
SQL_MIGRATION_COUNT=0

# Get all SQL migration files and sort them
for migration in $(ls "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | sort); do
  echo "========================================="
  echo "Running migration: $(basename "${migration}")"
  echo "Full path: ${migration}"
  echo "========================================="

  if [ "${USE_DOCKER_PSQL}" = "true" ]; then
    # Docker exec psql - pipe file content into container
    OUTPUT=$(cat "${migration}" | docker exec -i -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
      psql -U "${PSQL_USER}" -d "${PSQL_DB}" -v ON_ERROR_STOP=1 2>&1)
    EXIT_CODE=$?
  else
    # Local psql - use connection string to force TCP connection
    OUTPUT=$(psql "postgresql://${PSQL_USER}:${DB_PASSWORD}@${PSQL_HOST}:${PSQL_PORT}/${PSQL_DB}" \
      -f "${migration}" -v ON_ERROR_STOP=1 2>&1)
    EXIT_CODE=$?
  fi

  echo "${OUTPUT}"

  if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ Migration $(basename "${migration}") completed successfully"
    SQL_MIGRATION_COUNT=$((SQL_MIGRATION_COUNT + 1))

    # After base schema, verify tables were created
    if [[ "${migration}" == *"base-schema"* ]]; then
      echo "Verifying base tables were created..."
      if [ "${USE_DOCKER_PSQL}" = "true" ]; then
        TABLE_CHECK=$(docker exec -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
          psql -U "${PSQL_USER}" -d "${PSQL_DB}" \
          -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'customers', 'tickets', 'invoices', 'inventory_items');")
      else
        TABLE_CHECK=$(psql "postgresql://${PSQL_USER}:${DB_PASSWORD}@${PSQL_HOST}:${PSQL_PORT}/${PSQL_DB}" \
          -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'customers', 'tickets', 'invoices', 'inventory_items');")
      fi
      # Trim whitespace from TABLE_CHECK
      TABLE_CHECK=$(echo "${TABLE_CHECK}" | tr -d '[:space:]')
      echo "Base tables found: ${TABLE_CHECK}"
      if [ "${TABLE_CHECK}" -lt 5 ]; then
        echo "ERROR: Base schema migration did not create all required tables!"
        exit 1
      fi
    fi
  else
    echo "✗ Migration $(basename "${migration}") failed with exit code ${EXIT_CODE}"
    exit 1
  fi
done

echo "Successfully ran ${SQL_MIGRATION_COUNT} SQL migrations"

# Run JavaScript migrations using Sequelize CLI
echo ""
echo "Running JavaScript migrations..."
JS_MIGRATION_COUNT=0

# Run JavaScript migrations using Sequelize CLI
# Always run from backend directory and use the same DB connection as SQL migrations
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${BACKEND_DIR}"

# Set environment variables for Sequelize (use the same DB connection settings)
export NODE_ENV=test
export DB_HOST="${DB_HOST}"
export DB_PORT="${DB_PORT}"  # Use the same port (5433 for test DB)
export DB_USER="${DB_USER}"
export DB_PASSWORD="${DB_PASSWORD}"
export DB_NAME="${DB_NAME}"

# Run Sequelize migrations
echo "Running Sequelize migrations..."
MIGRATION_OUTPUT=$(npx sequelize-cli db:migrate 2>&1)
MIGRATION_EXIT_CODE=$?

echo "${MIGRATION_OUTPUT}"

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
  echo "✓ JavaScript migrations completed successfully"
  JS_MIGRATION_COUNT=1  # Sequelize CLI handles all JS migrations at once
else
  # Check if the error is just "already applied" which is fine
  if echo "${MIGRATION_OUTPUT}" | grep -q "already applied\|No migrations were executed"; then
    echo "✓ JavaScript migrations already applied (skipped)"
    JS_MIGRATION_COUNT=1
  else
    echo "✗ JavaScript migrations failed with exit code ${MIGRATION_EXIT_CODE}"
    exit 1
  fi
fi

TOTAL_MIGRATION_COUNT=$((SQL_MIGRATION_COUNT + JS_MIGRATION_COUNT))
echo "Successfully ran ${TOTAL_MIGRATION_COUNT} migrations (${SQL_MIGRATION_COUNT} SQL, ${JS_MIGRATION_COUNT} JS)"
echo "All migrations completed successfully"

# Verify database schema
echo "Verifying database tables exist..."
if [ "${USE_DOCKER_PSQL}" = "true" ]; then
  docker exec -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
    psql -U "${PSQL_USER}" -d "${PSQL_DB}" -c "\dt" || exit 1

  # Verify key tables exist (including new inventory reference tables)
  echo "Checking for required tables..."
  TABLE_COUNT=$(docker exec -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
    psql -U "${PSQL_USER}" -d "${PSQL_DB}" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('companies', 'users', 'customers', 'tickets', 'invoices', 'role_permissions', 'inventory_categories', 'inventory_subcategories', 'inventory_brands', 'inventory_models');")
else
  psql "postgresql://${PSQL_USER}:${DB_PASSWORD}@${PSQL_HOST}:${PSQL_PORT}/${PSQL_DB}" -c "\dt" || exit 1

  # Verify key tables exist (including new inventory reference tables)
  echo "Checking for required tables..."
  TABLE_COUNT=$(psql "postgresql://${PSQL_USER}:${DB_PASSWORD}@${PSQL_HOST}:${PSQL_PORT}/${PSQL_DB}" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('companies', 'users', 'customers', 'tickets', 'invoices', 'role_permissions', 'inventory_categories', 'inventory_subcategories', 'inventory_brands', 'inventory_models');")
fi

# Trim whitespace from TABLE_COUNT
TABLE_COUNT=$(echo "${TABLE_COUNT}" | tr -d '[:space:]')
echo "Found ${TABLE_COUNT} required tables"
if [ "${TABLE_COUNT}" -lt 10 ]; then
  echo "ERROR: Not all required tables exist! Expected at least 10 tables (6 base + 4 inventory reference tables)"
  exit 1
fi
echo "✓ All required tables exist"

