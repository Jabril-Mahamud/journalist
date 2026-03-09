# backend/crud/projects.py

from typing import List, Optional

from sqlalchemy.orm import Session

import models


def get_or_create_project(
    db: Session,
    name: str,
    user_id: int,
    color: str = "#6366f1",
) -> models.Project:
    """Return an existing project for this user, or create one if it doesn't exist."""
    name = name.strip().lower()
    project = db.query(models.Project).filter(
        models.Project.name == name,
        models.Project.user_id == user_id,
    ).first()

    if not project:
        project = models.Project(name=name, user_id=user_id, color=color)
        db.add(project)
        db.commit()
        db.refresh(project)

    return project


def get_all_projects(db: Session, user_id: int) -> List[models.Project]:
    """Return all projects for a user, ordered alphabetically by name."""
    return (
        db.query(models.Project)
        .filter(models.Project.user_id == user_id)
        .order_by(models.Project.name)
        .all()
    )


def delete_project(db: Session, project_id: int, user_id: int) -> Optional[models.Project]:
    """Delete a project owned by the user and return it, or None if not found.

    The many-to-many cascade removes the project from all entries automatically.
    """
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == user_id,
    ).first()

    if project:
        db.delete(project)
        db.commit()

    return project


def update_project_color(
    db: Session,
    project_id: int,
    color: str,
    user_id: int,
) -> Optional[models.Project]:
    """Update the colour of a user-owned project. Returns None if not found."""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == user_id,
    ).first()

    if project:
        project.color = color
        db.commit()
        db.refresh(project)

    return project