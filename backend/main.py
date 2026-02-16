from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import crud, schemas, models
from database import engine, get_db

from fastapi.middleware.cors import CORSMiddleware

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Journalist API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/focus-points/", response_model=list[schemas.FocusPoint])
def get_focus_points(db: Session = Depends(get_db)):
    """Get all focus points"""
    return crud.get_all_focus_points(db)

@app.post("/entries/", response_model=schemas.JournalEntry)
def create_entry(entry: schemas.JournalEntryCreate, db: Session = Depends(get_db)):
    return crud.create_entry(db, entry)

@app.get("/entries/", response_model=list[schemas.JournalEntry])
def read_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_entries(db, skip, limit)

@app.get("/entries/{entry_id}", response_model=schemas.JournalEntry)
def read_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = crud.get_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@app.put("/entries/{entry_id}", response_model=schemas.JournalEntry)
def update_entry(entry_id: int, entry: schemas.JournalEntryUpdate, db: Session = Depends(get_db)):
    updated = crud.update_entry(db, entry_id, entry)
    if not updated:
        raise HTTPException(status_code=404, detail="Entry not found")
    return updated

@app.delete("/entries/{entry_id}", response_model=schemas.JournalEntry)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_entry(db, entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    return deleted