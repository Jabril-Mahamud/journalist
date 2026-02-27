#!/bin/bash
set -e

# Build DATABASE_URL from individual env vars if not already set
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_HOST}:5432/${POSTGRES_DB}"
fi

echo "Running database migrations..."
yoyo apply --no-config-file --database "$DATABASE_URL" ./migrations

echo "Starting server..."
exec uvicorn main:app --host 0.0.0.0 --port 8001