import os
import psycopg
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/ready")
def ready():
    try:
        with psycopg.connect(
            os.environ["DATABASE_URL"],
            connect_timeout=2,
        ):
            return {"status": "ready"}
    except Exception as e:
        return {"status": "not-ready", "error": str(e)}
