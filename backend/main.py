import os
import requests as http_requests
from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import crud, schemas, models
from database import engine, get_db
from auth import get_current_user
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import List


def get_rate_limit_key(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    return auth_header or get_remote_address(request)


limiter = Limiter(key_func=get_rate_limit_key)

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Journalist API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TODOIST_API = "https://api.todoist.com/api/v1"

def _todoist_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _get_todoist_token(current_user: models.User) -> str:
    if not current_user.todoist_token:
        raise HTTPException(status_code=400, detail="Todoist account not connected")
    return current_user.todoist_token


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check endpoint (no auth required)"""
    return {"status": "ok"}


# ── Focus points ──────────────────────────────────────────────────────────────

@app.get("/focus-points/", response_model=list[schemas.FocusPoint])
def get_focus_points(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_all_focus_points(db, current_user.id)

@app.post("/focus-points/", response_model=schemas.FocusPoint)
@limiter.limit("60/minute")
def create_focus_point(
    request: Request,
    focus_point: schemas.FocusPointCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_or_create_focus_point(db, focus_point.name, current_user.id)

@app.delete("/focus-points/{focus_point_id}", response_model=schemas.FocusPoint)
@limiter.limit("60/minute")
def delete_focus_point(
    request: Request,
    focus_point_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    deleted = crud.delete_focus_point(db, focus_point_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Focus point not found")
    return deleted

@app.patch("/focus-points/{focus_point_id}", response_model=schemas.FocusPoint)
def update_focus_point(
    focus_point_id: int,
    update_data: schemas.FocusPointUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated = crud.update_focus_point_color(db, focus_point_id, update_data.color, current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Focus point not found")
    return updated


# ── Journal entries ───────────────────────────────────────────────────────────

@app.post("/entries/", response_model=schemas.JournalEntry)
@limiter.limit("60/minute")
def create_entry(
    request: Request,
    entry: schemas.JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_entry(db, entry, current_user.id)

@app.get("/entries/", response_model=list[schemas.JournalEntry])
def read_entries(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_entries(db, current_user.id, skip, limit)

@app.get("/entries/{entry_id}", response_model=schemas.JournalEntry)
def read_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    entry = crud.get_entry(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@app.put("/entries/{entry_id}", response_model=schemas.JournalEntry)
@limiter.limit("60/minute")
def update_entry(
    request: Request,
    entry_id: int,
    entry: schemas.JournalEntryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated = crud.update_entry(db, entry_id, entry, current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Entry not found")
    return updated

@app.delete("/entries/{entry_id}", response_model=schemas.JournalEntry)
@limiter.limit("60/minute")
def delete_entry(
    request: Request,
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    deleted = crud.delete_entry(db, entry_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    return deleted


# ── Todoist – token management ────────────────────────────────────────────────

@app.get("/todoist/status", response_model=schemas.TodoistTokenStatus)
def todoist_status(current_user: models.User = Depends(get_current_user)):
    """Check whether the user has a Todoist token saved."""
    return {"connected": bool(current_user.todoist_token)}


@app.put("/todoist/token")
@limiter.limit("10/minute")
def save_todoist_token(
    request: Request,
    body: schemas.TodoistTokenSave,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Validate the token against Todoist, then persist it."""
    resp = http_requests.get(
        f"{TODOIST_API}/projects",
        headers=_todoist_headers(body.token),
        timeout=10,
    )
    if resp.status_code == 401:
        raise HTTPException(status_code=400, detail="Invalid Todoist API token")
    if not resp.ok:
        raise HTTPException(
            status_code=502, 
            detail=f"Could not reach Todoist: {resp.status_code} {resp.text}"
        )
    current_user.todoist_token = body.token
    db.commit()
    return {"connected": True}


@app.delete("/todoist/token")
def delete_todoist_token(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove the stored Todoist token."""
    current_user.todoist_token = None
    db.commit()
    return {"connected": False}


# ── Todoist – task proxy ──────────────────────────────────────────────────────

@app.get("/todoist/tasks", response_model=List[schemas.TodoistTask])
def get_todoist_tasks(
    current_user: models.User = Depends(get_current_user),
):
    """Fetch the user's active (incomplete) tasks from Todoist."""
    token = _get_todoist_token(current_user)

    resp = http_requests.get(
        f"{TODOIST_API}/tasks",
        headers=_todoist_headers(token),
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(
            status_code=502, 
            detail=f"Could not reach Todoist: {resp.status_code} {resp.text}"
        )

    # Fetch projects for name lookup
    proj_resp = http_requests.get(
        f"{TODOIST_API}/projects",
        headers=_todoist_headers(token),
        timeout=10,
    )
    project_names: dict = {}
    if proj_resp.ok:
        data = proj_resp.json()
        projects = data if isinstance(data, list) else data.get("results", [])
        project_names = {p["id"]: p["name"] for p in projects}

    tasks = []
    data = resp.json()
    items = data if isinstance(data, list) else data.get("results", [])
    for t in items:
        tasks.append(schemas.TodoistTask(
            id=t["id"],
            content=t["content"],
            description=t.get("description", ""),
            is_completed=t.get("is_completed", False),
            priority=t.get("priority", 1),
            due=t.get("due"),
            project_id=t.get("project_id"),
            project_name=project_names.get(t.get("project_id", ""), None),
            url=t.get("url", ""),
        ))
    return tasks


@app.post("/todoist/tasks/{task_id}/close")
@limiter.limit("60/minute")
def close_todoist_task(
    request: Request,
    task_id: str,
    current_user: models.User = Depends(get_current_user),
):
    """Mark a Todoist task as complete."""
    token = _get_todoist_token(current_user)

    resp = http_requests.post(
        f"{TODOIST_API}/tasks/{task_id}/close",
        headers=_todoist_headers(token),
        timeout=10,
    )
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Task not found in Todoist")
    if not resp.ok:
        raise HTTPException(
            status_code=502, 
            detail=f"Could not reach Todoist: {resp.status_code} {resp.text}"
        )
    return {"closed": True}


# ── Entry ↔ task links ────────────────────────────────────────────────────────

@app.get("/entries/{entry_id}/tasks", response_model=List[schemas.EntryTaskOut])
def get_entry_tasks(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return the Todoist task IDs linked to this entry."""
    entry = crud.get_entry(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry.entry_tasks


@app.post("/entries/{entry_id}/tasks", response_model=schemas.EntryTaskOut)
@limiter.limit("60/minute")
def link_task_to_entry(
    request: Request,
    entry_id: int,
    body: schemas.EntryTaskLink,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Link a Todoist task to a journal entry."""
    entry = crud.get_entry(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    # Prevent duplicate links
    existing = (
        db.query(models.EntryTask)
        .filter_by(entry_id=entry_id, todoist_task_id=body.todoist_task_id)
        .first()
    )
    if existing:
        return existing

    link = models.EntryTask(entry_id=entry_id, todoist_task_id=body.todoist_task_id)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@app.delete("/entries/{entry_id}/tasks/{task_id}")
@limiter.limit("60/minute")
def unlink_task_from_entry(
    request: Request,
    entry_id: int,
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove a task link from an entry."""
    entry = crud.get_entry(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    link = (
        db.query(models.EntryTask)
        .filter_by(entry_id=entry_id, todoist_task_id=task_id)
        .first()
    )
    if link:
        db.delete(link)
        db.commit()
    return {"unlinked": True}