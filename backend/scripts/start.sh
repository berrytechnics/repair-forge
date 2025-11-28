#!/bin/sh
set -e

echo "Starting application..."

# Run database migrations
echo "Running database migrations..."
yarn migrate:prod || {
  echo "Migration failed, but continuing (migrations may already be applied)"
}

# Start the server
echo "Starting server..."
exec yarn start

