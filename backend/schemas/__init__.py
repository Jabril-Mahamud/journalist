# backend/schemas/__init__.py
"""
Pydantic schemas, split by domain.

All names are re-exported here so existing code that does:

    import schemas
    schemas.JournalEntry / schemas.Template / ...

continues to work without any changes.
"""

from .entries import (
    EntryTaskLink,
    EntryTaskOut,
    JournalEntry,
    JournalEntryBase,
    JournalEntryCreate,
    JournalEntryUpdate,
    UnlinkResult,
)
from .projects import Project, ProjectBase, ProjectCreate, ProjectUpdate
from .templates import Template, TemplateBase, TemplateCreate, TemplateUpdate
from .todoist import TodoistReschedule, TodoistTask, TodoistTokenSave, TodoistTokenStatus
from .users import User, UserBase

__all__ = [
    # Users
    "UserBase",
    "User",
    # Projects
    "ProjectBase",
    "ProjectCreate",
    "ProjectUpdate",
    "Project",
    # Entries
    "JournalEntryBase",
    "JournalEntryCreate",
    "JournalEntryUpdate",
    "JournalEntry",
    "EntryTaskLink",
    "EntryTaskOut",
    "UnlinkResult",
    # Todoist
    "TodoistTokenSave",
    "TodoistTokenStatus",
    "TodoistTask",
    "TodoistReschedule",
    # Templates
    "TemplateBase",
    "TemplateCreate",
    "TemplateUpdate",
    "Template",
]