from sqlalchemy.orm import Session
import models, schemas
from typing import List

def get_or_create_focus_point(db: Session, name: str) -> models.FocusPoint:
    """Get existing focus point or create new one"""
    name = name.strip().lower()
    focus_point = db.query(models.FocusPoint).filter(
        models.FocusPoint.name == name
    ).first()
    
    if not focus_point:
        focus_point = models.FocusPoint(name=name)
        db.add(focus_point)
        db.commit()
        db.refresh(focus_point)
    
    return focus_point

def get_all_focus_points(db: Session) -> List[models.FocusPoint]:
    """Get all focus points"""
    return db.query(models.FocusPoint).order_by(models.FocusPoint.name).all()

def create_entry(db: Session, entry: schemas.JournalEntryCreate):
    # Create the entry
    db_entry = models.JournalEntry(
        title=entry.title,
        content=entry.content
    )
    
    # Add focus points
    for focus_name in entry.focus_point_names:
        focus_point = get_or_create_focus_point(db, focus_name)
        db_entry.focus_points.append(focus_point)
    
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
        db_entry.title = entry.title
        db_entry.content = entry.content
        
        # Update focus points
        db_entry.focus_points.clear()
        for focus_name in entry.focus_point_names:
            focus_point = get_or_create_focus_point(db, focus_name)
            db_entry.focus_points.append(focus_point)
        
        db.commit()
        db.refresh(db_entry)
    return db_entry

def delete_entry(db: Session, entry_id: int):
    db_entry = get_entry(db, entry_id)
    if db_entry:
        db.delete(db_entry)
        db.commit()
    return db_entry