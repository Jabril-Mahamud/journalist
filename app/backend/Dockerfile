FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
RUN pip install --no-cache-dir fastapi "uvicorn[standard]" psycopg

# Copy app code
COPY src/ /app/src/

ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]