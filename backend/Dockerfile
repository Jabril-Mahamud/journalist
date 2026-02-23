FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Don't run as root
RUN adduser --disabled-password --gecos "" appuser
USER appuser

# Tell Docker what port the app uses
EXPOSE 8001

# Health check so Fly knows when the app is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

CMD ["./entrypoint.sh"]