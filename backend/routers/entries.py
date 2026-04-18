from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session

import crud
import schemas
import models
from database import get_db
from auth import get_current_user
from rate_limit import limiter

router = APIRouter(prefix="/entries", tags=["entries"])


@router.post("/", response_model=schemas.JournalEntry, status_code=201)
@limiter.limit("60/minute")
def create_entry(
    request: Request,
    entry: schemas.JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_entry(db, entry, current_user.id)


@router.get("/", response_model=list[schemas.JournalEntry])
def read_entries(
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_entries(db, current_user.id, skip, limit)


@router.get("/{entry_id}", response_model=schemas.JournalEntry)
def read_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    entry = crud.get_entry(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.put("/{entry_id}", response_model=schemas.JournalEntry)
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


@router.delete("/{entry_id}", response_model=schemas.JournalEntry)
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


@router.get("/{entry_id}/tasks", response_model=list[schemas.EntryTaskOut])
def get_entry_tasks(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = crud.get_entry(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry.entry_tasks


@router.post("/{entry_id}/tasks", response_model=schemas.EntryTaskOut, status_code=201)
@limiter.limit("60/minute")
def link_task_to_entry(
    request: Request,
    entry_id: int,
    body: schemas.EntryTaskLink,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = crud.get_entry(db, entry_id, current_user.id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

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


@router.delete("/{entry_id}/tasks/{task_id}", response_model=schemas.UnlinkResult)
@limiter.limit("60/minute")
def unlink_task_from_entry(
    request: Request,
    entry_id: int,
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
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
