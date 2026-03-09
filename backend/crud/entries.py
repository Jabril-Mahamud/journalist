# backend/crud/entries.py

from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

import models
import schemas
from .projects import get_or_create_project


def create_entry(
    db: Session,
    entry: schemas.JournalEntryCreate,
    user_id: int,
) -> models.JournalEntry:
    """Create a new journal entry, auto-creating any referenced projects."""
    db_entry = models.JournalEntry(
        title=entry.title,
        content=entry.content,
        user_id=user_id,
    )
    db.add(db_entry)

    for project_name in entry.project_names:
        project = get_or_create_project(db, project_name, user_id)
        db_entry.projects.append(project)

    db.commit()
    db.refresh(db_entry)
    return db_entry


def get_entries(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
) -> List[models.JournalEntry]:
    """Return a user's entries, newest first, with projects and tasks eager-loaded."""
    return (
        db.query(models.JournalEntry)
        .options(joinedload(models.JournalEntry.projects))
        .options(joinedload(models.JournalEntry.entry_tasks))
        .filter(models.JournalEntry.user_id == user_id)
        .order_by(models.JournalEntry.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_entry(
    db: Session,
    entry_id: int,
    user_id: int,
) -> Optional[models.JournalEntry]:
    """Fetch a single entry. Returns None if not found or not owned by the user."""
    return db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id,
        models.JournalEntry.user_id == user_id,
    ).first()


def update_entry(
    db: Session,
    entry_id: int,
    entry: schemas.JournalEntryUpdate,
    user_id: int,
) -> Optional[models.JournalEntry]:
    """Update an entry's title, content, and project list. Returns None if not found."""
    db_entry = get_entry(db, entry_id, user_id)
    if not db_entry:
        return None

    db_entry.title = entry.title
    db_entry.content = entry.content

    db_entry.projects.clear()
    for project_name in entry.project_names:
        project = get_or_create_project(db, project_name, user_id)
        db_entry.projects.append(project)

    db.commit()
    db.refresh(db_entry)
    return db_entry


def delete_entry(
    db: Session,
    entry_id: int,
    user_id: int,
) -> Optional[models.JournalEntry]:
    """Delete a user-owned entry and return it, or None if not found."""
    db_entry = get_entry(db, entry_id, user_id)
    if db_entry:
        db.delete(db_entry)
        db.commit()
    return db_entry