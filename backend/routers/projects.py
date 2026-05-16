from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

import crud
import schemas
import models
from database import get_db
from auth import get_current_user
from rate_limit import limiter

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=list[schemas.Project])
def get_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_all_projects(db, current_user.id)


@router.post("/", response_model=schemas.Project, status_code=201)
@limiter.limit("60/minute")
def create_project(
    request: Request,
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_or_create_project(db, project.name, current_user.id, project.color)


@router.delete("/{project_id}", response_model=schemas.Project)
@limiter.limit("60/minute")
def delete_project(
    request: Request,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    deleted = crud.delete_project(db, project_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return deleted


@router.patch("/{project_id}", response_model=schemas.Project)
@limiter.limit("60/minute")
def update_project(
    request: Request,
    project_id: int,
    update_data: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated = crud.update_project_color(db, project_id, update_data.color, current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated
