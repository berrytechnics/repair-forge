#!/bin/bash
# Reset local database and run migrations
# This script uses the TypeScript reset script which handles everything

set -e

# Change to backend directory
cd "$(dirname "$0")/../backend" || exit 1

# Always use localhost when running locally (not in Docker)
# This overrides any DB_HOST=postgres from .env files
if [ -z "$IS_DOCKER" ]; then
    export DB_HOST=localhost
fi

# Run the TypeScript reset script
yarn reset:db

