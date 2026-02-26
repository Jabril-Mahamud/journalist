from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

import crud
import schemas
import models
from database import get_db
from auth import get_current_user
from utils.trigger_matcher import matches_trigger

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/suggestions", response_model=list[schemas.Template])
def get_template_suggestions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return templates whose trigger conditions match the current datetime."""
    all_templates = crud.get_templates(db, current_user.id)
    return [t for t in all_templates if matches_trigger(t.trigger_conditions)]


@router.get("/", response_model=list[schemas.Template])
def list_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all templates available to the user (own + built-ins)."""
    return crud.get_templates(db, current_user.id)


@router.post("/", response_model=schemas.Template)
@limiter.limit("60/minute")
def create_template(
    request: Request,
    template: schemas.TemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.create_template(db, template, current_user.id)


@router.get("/{template_id}", response_model=schemas.Template)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    template = crud.get_template(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=schemas.Template)
@limiter.limit("60/minute")
def update_template(
    request: Request,
    template_id: int,
    template: schemas.TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    updated = crud.update_template(db, template_id, template, current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return updated


@router.delete("/{template_id}", response_model=schemas.Template)
@limiter.limit("60/minute")
def delete_template(
    request: Request,
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    deleted = crud.delete_template(db, template_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    return deleted


@router.post("/{template_id}/fork", response_model=schemas.Template)
@limiter.limit("60/minute")
def fork_template(
    request: Request,
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fork a public or built-in template into the user's own collection."""
    forked = crud.fork_template(db, template_id, current_user.id)
    if not forked:
        raise HTTPException(status_code=404, detail="Template not found or not forkable")
    return forked