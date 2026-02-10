from sqlalchemy.orm import Session
import models, schemas
from typing import List, Optional

def create_entry(db: Session, entry: schemas.JournalEntryCreate):
    db_entry = models.JournalEntry(**entry.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

def get_entries(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.JournalEntry).order_by(
        models.JournalEntry.created_at.desc()
    ).offset(skip).limit(limit).all()

def get_entry(db: Session, entry_id: int):
    return db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id
    ).first()

def update_entry(db: Session, entry_id: int, entry: schemas.JournalEntryUpdate):
    db_entry = get_entry(db, entry_id)
    if db_entry:
        for key, value in entry.dict().items():
            setattr(db_entry, key, value)
        db.commit()
        db.refresh(db_entry)
    return db_entry

def delete_entry(db: Session, entry_id: int):
    db_entry = get_entry(db, entry_id)
    if db_entry:
        db.delete(db_entry)
        db.commit()
    return db_entry