from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import crud, schemas, models
from database import engine, get_db
from auth import get_current_user
from fastapi.middleware.cors import CORSMiddleware

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Journalist API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
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

@app.post("/entries/", response_model=schemas.JournalEntry)
def create_entry(
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
def update_entry(
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
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete an entry (only if user owns it)"""
    deleted = crud.delete_entry(db, entry_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    return deleted