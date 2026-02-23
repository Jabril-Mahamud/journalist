import os
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from fastapi.middleware.cors import CORSMiddleware

from routers import entries, projects, todoist


def get_rate_limit_key(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    return auth_header or request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_rate_limit_key)

app = FastAPI(title="Journalist API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entries.router)
app.include_router(projects.router)
app.include_router(todoist.router)


@app.get("/health")
def health():
    return {"status": "ok"}
