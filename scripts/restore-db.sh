#!/bin/bash
# Database restore script for production
# Usage: ./scripts/restore-db.sh <backup-file>

set -e

if [ -z "$1" ]; then
  echo "Error: Backup file required"
  echo "Usage: ./scripts/restore-db.sh <backup-file>"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "Decompressing backup file..."
  gunzip -c "$BACKUP_FILE" > "${BACKUP_FILE%.gz}"
  BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

echo "WARNING: This will restore the database from backup."
echo "This will DELETE all current data!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Check if running in Docker Compose environment
if docker compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
  echo "Using Docker Compose for restore..."

  # Restore using Docker Compose
  docker compose -f docker-compose.prod.yml exec -T postgres psql \
    -U ${POSTGRES_USER:-circuit_sage_user} \
    -d ${POSTGRES_DB:-circuit_sage_db} < "${BACKUP_FILE}"
else
  # Load environment variables
  if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
  elif [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
  fi

  # Check if required environment variables are set
  if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "Error: Database connection variables are not set"
    echo "Required: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
    exit 1
  fi

  # Set PGPASSWORD for psql
  export PGPASSWORD="${DB_PASSWORD}"

  echo "Starting database restore..."
  echo "Database: ${DB_NAME}"
  echo "Host: ${DB_HOST}:${DB_PORT:-5432}"
  echo "Backup file: ${BACKUP_FILE}"

  # Check if psql is available
  if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed"
    echo "Install PostgreSQL client tools to use this script"
    exit 1
  fi

  # Perform restore
  psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT:-5432}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -f "${BACKUP_FILE}"
fi

echo "Database restore completed successfully"

