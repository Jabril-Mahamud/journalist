from sqlalchemy.orm import Session
import models, schemas
from typing import List

def get_or_create_project(db: Session, name: str, user_id: int, color: str = "#6366f1") -> models.Project:
    """Get existing project for this user or create new one"""
    name = name.strip().lower()
    project = db.query(models.Project).filter(
        models.Project.name == name,
        models.Project.user_id == user_id
    ).first()
    
    if not project:
        project = models.Project(name=name, user_id=user_id, color=color)
        db.add(project)
        db.commit()
        db.refresh(project)
    
    return project

def get_all_projects(db: Session, user_id: int) -> List[models.Project]:
    """Get all projects for a specific user"""
    return db.query(models.Project).filter(
        models.Project.user_id == user_id
    ).order_by(models.Project.name).all()

def delete_project(db: Session, project_id: int, user_id: int):
    """Delete a project (only if owned by the user).
    
    Removing a project automatically removes it from all entries
    via the cascade on the many-to-many relationship.
    """
    from typing import Optional
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == user_id
    ).first()
    
    if project:
        db.delete(project)
        db.commit()
    
    return project

def update_project_color(db: Session, project_id: int, color: str, user_id: int):
    """Update the color of a project (only if owned by the user)."""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == user_id
    ).first()
    
    if project:
        project.color = color
        db.commit()
        db.refresh(project)
    
    return project

def create_entry(db: Session, entry: schemas.JournalEntryCreate, user_id: int):
    """Create a new journal entry for a specific user"""
    db_entry = models.JournalEntry(
        title=entry.title,
        content=entry.content,
        user_id=user_id
    )
    
    for project_name in entry.project_names:
        project = get_or_create_project(db, project_name, user_id)
        db_entry.projects.append(project)
    
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
        
        db_entry.projects.clear()
        for project_name in entry.project_names:
            project = get_or_create_project(db, project_name, user_id)
            db_entry.projects.append(project)
        
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
