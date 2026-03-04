# backend/crud/__init__.py
"""
Database operations (CRUD), split by domain.

All names are re-exported here so existing code that does:

    import crud
    crud.create_entry / crud.get_templates / ...

continues to work without any changes.
"""

from .entries import create_entry, delete_entry, get_entries, get_entry, update_entry
from .projects import (
    delete_project,
    get_all_projects,
    get_or_create_project,
    update_project_color,
)
from .templates import (
    create_template,
    delete_template,
    fork_template,
    get_template,
    get_templates,
    update_template,
)

__all__ = [
    # Projects
    "get_or_create_project",
    "get_all_projects",
    "delete_project",
    "update_project_color",
    # Entries
    "create_entry",
    "get_entries",
    "get_entry",
    "update_entry",
    "delete_entry",
    # Templates
    "get_templates",
    "get_template",
    "create_template",
    "update_template",
    "delete_template",
    "fork_template",
]