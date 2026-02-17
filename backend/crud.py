from sqlalchemy.orm import Session
import models, schemas
from typing import List

def get_or_create_focus_point(db: Session, name: str, user_id: int) -> models.FocusPoint:
    """Get existing focus point for this user or create new one"""
    name = name.strip().lower()
    focus_point = db.query(models.FocusPoint).filter(
        models.FocusPoint.name == name,
        models.FocusPoint.user_id == user_id
    ).first()
    
    if not focus_point:
        focus_point = models.FocusPoint(name=name, user_id=user_id)
        db.add(focus_point)
        db.commit()
        db.refresh(focus_point)
    
    return focus_point

def get_all_focus_points(db: Session, user_id: int) -> List[models.FocusPoint]:
    """Get all focus points for a specific user"""
    return db.query(models.FocusPoint).filter(
        models.FocusPoint.user_id == user_id
    ).order_by(models.FocusPoint.name).all()

def create_entry(db: Session, entry: schemas.JournalEntryCreate, user_id: int):
    """Create a new journal entry for a specific user"""
    # Create the entry
    db_entry = models.JournalEntry(
        title=entry.title,
        content=entry.content,
        user_id=user_id
    )
    
    # Add focus points (user-scoped)
    for focus_name in entry.focus_point_names:
        focus_point = get_or_create_focus_point(db, focus_name, user_id)
        db_entry.focus_points.append(focus_point)
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

def get_entries(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    """Get all entries for a specific user"""
    return db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == user_id
    ).order_by(
        models.JournalEntry.created_at.desc()
    ).offset(skip).limit(limit).all()

def get_entry(db: Session, entry_id: int, user_id: int):
    """Get a specific entry for a user (ensures user owns the entry)"""
    return db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id,
        models.JournalEntry.user_id == user_id
    ).first()

def update_entry(db: Session, entry_id: int, entry: schemas.JournalEntryUpdate, user_id: int):
    """Update an entry (only if user owns it)"""
    db_entry = get_entry(db, entry_id, user_id)
    if db_entry:
        db_entry.title = entry.title
        db_entry.content = entry.content
        
        # Update focus points (user-scoped)
        db_entry.focus_points.clear()
        for focus_name in entry.focus_point_names:
            focus_point = get_or_create_focus_point(db, focus_name, user_id)
            db_entry.focus_points.append(focus_point)
        
        db.commit()
        db.refresh(db_entry)
    return db_entry

def delete_entry(db: Session, entry_id: int, user_id: int):
    """Delete an entry (only if user owns it)"""
    db_entry = get_entry(db, entry_id, user_id)
    if db_entry:
        db.delete(db_entry)
        db.commit()
    return db_entry