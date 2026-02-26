from sqlalchemy.orm import Session, joinedload
import models, schemas
from typing import List, Optional


def get_or_create_project(db: Session, name: str, user_id: int, color: str = "#6366f1") -> models.Project:
    """Get existing project for this user or create new one."""
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
    """Get all projects for a specific user."""
    return db.query(models.Project).filter(
        models.Project.user_id == user_id
    ).order_by(models.Project.name).all()


def delete_project(db: Session, project_id: int, user_id: int):
    """Delete a project (only if owned by the user).

    Removing a project automatically removes it from all entries
    via the cascade on the many-to-many relationship.
    """
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
    """Create a new journal entry for a specific user."""
    db_entry = models.JournalEntry(
        title=entry.title,
        content=entry.content,
        user_id=user_id
    )
    db.add(db_entry)

    for project_name in entry.project_names:
        project = get_or_create_project(db, project_name, user_id)
        db_entry.projects.append(project)

    db.commit()
    db.refresh(db_entry)
    return db_entry


def get_entries(db, user_id, skip=0, limit=100):
    return db.query(models.JournalEntry)\
        .options(joinedload(models.JournalEntry.projects))\
        .options(joinedload(models.JournalEntry.entry_tasks))\
        .filter(models.JournalEntry.user_id == user_id)\
        .order_by(models.JournalEntry.created_at.desc())\
        .offset(skip).limit(limit).all()


def get_entry(db: Session, entry_id: int, user_id: int):
    """Get a specific entry for a user (ensures user owns the entry)."""
    return db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id,
        models.JournalEntry.user_id == user_id
    ).first()


def update_entry(db: Session, entry_id: int, entry: schemas.JournalEntryUpdate, user_id: int):
    """Update an entry (only if user owns it)."""
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
    """Delete an entry (only if user owns it)."""
    db_entry = get_entry(db, entry_id, user_id)
    if db_entry:
        db.delete(db_entry)
        db.commit()
    return db_entry


# ─── Templates ────────────────────────────────────────────────────────────────

def get_templates(db: Session, user_id: int) -> List[models.Template]:
    """Get all templates available to a user: their own + all built-ins."""
    return db.query(models.Template).filter(
        (models.Template.user_id == user_id) | (models.Template.is_built_in == True)
    ).order_by(models.Template.is_built_in.desc(), models.Template.name).all()


def get_template(db: Session, template_id: int, user_id: int) -> Optional[models.Template]:
    """Get a single template if user owns it or it is built-in."""
    return db.query(models.Template).filter(
        models.Template.id == template_id,
        (models.Template.user_id == user_id) | (models.Template.is_built_in == True)
    ).first()


def create_template(db: Session, template: schemas.TemplateCreate, user_id: int) -> models.Template:
    """Create a new template owned by the user."""
    db_template = models.Template(
        user_id=user_id,
        name=template.name,
        description=template.description,
        icon=template.icon,
        content=template.content,
        tags=template.tags,
        trigger_conditions=template.trigger_conditions,
        is_public=template.is_public,
        is_built_in=False,
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


def update_template(db: Session, template_id: int, template: schemas.TemplateUpdate, user_id: int) -> Optional[models.Template]:
    """Update a template (only if user owns it — built-ins cannot be updated)."""
    db_template = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == user_id,
        models.Template.is_built_in == False,
    ).first()

    if db_template:
        db_template.name = template.name
        db_template.description = template.description
        db_template.icon = template.icon
        db_template.content = template.content
        db_template.tags = template.tags
        db_template.trigger_conditions = template.trigger_conditions
        db_template.is_public = template.is_public
        db.commit()
        db.refresh(db_template)

    return db_template


def delete_template(db: Session, template_id: int, user_id: int) -> Optional[models.Template]:
    """Delete a template (only if user owns it — built-ins cannot be deleted)."""
    db_template = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == user_id,
        models.Template.is_built_in == False,
    ).first()

    if db_template:
        db.delete(db_template)
        db.commit()

    return db_template


def fork_template(db: Session, template_id: int, user_id: int) -> Optional[models.Template]:
    """Copy a public or built-in template into the user's own collection."""
    source = db.query(models.Template).filter(
        models.Template.id == template_id,
        (models.Template.is_built_in == True) | (models.Template.is_public == True)
    ).first()

    if not source:
        return None

    forked = models.Template(
        user_id=user_id,
        forked_from_id=source.id,
        name=source.name,
        description=source.description,
        icon=source.icon,
        content=source.content,
        tags=list(source.tags) if source.tags else [],
        trigger_conditions=dict(source.trigger_conditions) if source.trigger_conditions else None,
        is_public=False,
        is_built_in=False,
    )
    db.add(forked)
    db.commit()
    db.refresh(forked)
    return forked