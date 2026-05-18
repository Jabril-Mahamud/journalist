#!/bin/bash
set -e

# Build DATABASE_URL from individual env vars if not already set
if [ -z "$DATABASE_URL" ]; then
  ENCODED_PASSWORD=$(python3 -c "import urllib.parse, os; print(urllib.parse.quote(os.environ['POSTGRES_PASSWORD'], safe=''))")
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PASSWORD}@${DB_HOST}:5432/${POSTGRES_DB}"
fi

# Wait for database to be ready
echo "Waiting for database to be ready..."
DB_READY=false
for i in $(seq 1 30); do
  python3 -c "
import psycopg2, os, sys
try:
    psycopg2.connect(os.environ['DATABASE_URL'])
    sys.exit(0)
except:
    sys.exit(1)
" && { DB_READY=true; break; }
  echo "Attempt $i/30 — database not ready, retrying in 2s..."
  sleep 2
done

if [ "$DB_READY" = true ]; then
  echo "Running database migrations..."
  yoyo apply --no-config-file --database "$DATABASE_URL" ./migrations || echo "WARNING: migrations failed, starting server anyway"
else
  echo "WARNING: database not reachable after 60s, starting server without migrations"
fi

echo "Starting server..."
exec uvicorn main:app --host 0.0.0.0 --port 8001
