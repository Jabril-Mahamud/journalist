import os
from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import crud, schemas, models
from database import engine, get_db
from auth import get_current_user
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded


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

@app.get("/health")
def health():
    """Health check endpoint (no auth required)"""
    return {"status": "ok"}

@app.get("/focus-points/", response_model=list[schemas.FocusPoint])
def get_focus_points(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all focus points for the authenticated user"""
    return crud.get_all_focus_points(db, current_user.id)

@app.post("/focus-points/", response_model=schemas.FocusPoint)
@limiter.limit("60/minute")
def create_focus_point(
    request: Request,
    focus_point: schemas.FocusPointCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new focus point for the authenticated user"""
    return crud.get_or_create_focus_point(db, focus_point.name, current_user.id)

@app.delete("/focus-points/{focus_point_id}", response_model=schemas.FocusPoint)
@limiter.limit("60/minute")
def delete_focus_point(
    request: Request,
    focus_point_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a focus point (only if owned by the authenticated user).
    
    This also removes the focus point from any entries it was attached to.
    """
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
    """Update a focus point's color (only if owned by the authenticated user)."""
    updated = crud.update_focus_point_color(db, focus_point_id, update_data.color, current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Focus point not found")
    return updated

@app.post("/entries/", response_model=schemas.JournalEntry)
@limiter.limit("60/minute")
def create_entry(
    request: Request,
    entry: schemas.JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new journal entry for the authenticated user"""
    return crud.create_entry(db, entry, current_user.id)

@app.get("/entries/", response_model=list[schemas.JournalEntry])
def read_entries(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all entries for the authenticated user"""
    return crud.get_entries(db, current_user.id, skip, limit)

@app.get("/entries/{entry_id}", response_model=schemas.JournalEntry)
def read_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific entry (only if user owns it)"""
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
    """Update an entry (only if user owns it)"""
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
    """Delete an entry (only if user owns it)"""
    deleted = crud.delete_entry(db, entry_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    return deleted