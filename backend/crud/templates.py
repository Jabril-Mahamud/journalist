# backend/crud/templates.py

from typing import List, Optional

from sqlalchemy.orm import Session

import models
import schemas


def get_templates(db: Session, user_id: int) -> List[models.Template]:
    """Return all templates available to a user: their own plus all built-ins."""
    return (
        db.query(models.Template)
        .filter(
            (models.Template.user_id == user_id) | (models.Template.is_built_in == True)
        )
        .order_by(models.Template.is_built_in.desc(), models.Template.name)
        .all()
    )


def get_template(
    db: Session,
    template_id: int,
    user_id: int,
) -> Optional[models.Template]:
    """Fetch a single template if the user owns it or it is a built-in."""
    return db.query(models.Template).filter(
        models.Template.id == template_id,
        (models.Template.user_id == user_id) | (models.Template.is_built_in == True),
    ).first()


def create_template(
    db: Session,
    template: schemas.TemplateCreate,
    user_id: int,
) -> models.Template:
    """Create a new user-owned template."""
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


def update_template(
    db: Session,
    template_id: int,
    template: schemas.TemplateUpdate,
    user_id: int,
) -> Optional[models.Template]:
    """Update a user-owned template. Returns None for built-ins or other users' templates."""
    db_template = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == user_id,
        models.Template.is_built_in == False,
    ).first()

    if not db_template:
        return None

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


def delete_template(
    db: Session,
    template_id: int,
    user_id: int,
) -> Optional[models.Template]:
    """Delete a user-owned template. Returns None for built-ins or other users' templates."""
    db_template = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == user_id,
        models.Template.is_built_in == False,
    ).first()

    if db_template:
        db.delete(db_template)
        db.commit()

    return db_template


def fork_template(
    db: Session,
    template_id: int,
    user_id: int,
) -> Optional[models.Template]:
    """Copy a public or built-in template into the user's own collection.

    The fork starts private (is_public=False) regardless of the source's visibility.
    Returns None if the source template doesn't exist or isn't forkable.
    """
    source = db.query(models.Template).filter(
        models.Template.id == template_id,
        (models.Template.is_built_in == True) | (models.Template.is_public == True),
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