import os
from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from fastapi.middleware.cors import CORSMiddleware

from rate_limit import limiter
from routers import entries, projects, todoist, templates


app = FastAPI(title="Journalist API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3001").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(entries.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(todoist.router, prefix="/api")
app.include_router(templates.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
