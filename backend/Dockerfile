# Stage 1: base
FROM python:3.11-slim AS base
WORKDIR /app
COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/prod.txt

# Stage 2: test
FROM base AS test
RUN pip install --no-cache-dir -r requirements/dev.txt
COPY . .
RUN pytest --tb=short -q

# Stage 3: production
FROM base AS production
COPY . .
RUN chmod +x ./scripts/entrypoint.sh
RUN adduser --disabled-password --gecos "" appuser
USER appuser
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"
CMD ["./scripts/entrypoint.sh"]