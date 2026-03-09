# backend/schemas/entries.py

from datetime import datetime
from typing import Annotated, List

from pydantic import BaseModel, ConfigDict, Field

from .projects import Project


class JournalEntryBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=100_000)


class JournalEntryCreate(JournalEntryBase):
    project_names: List[Annotated[str, Field(min_length=1, max_length=50)]] = []


class JournalEntryUpdate(JournalEntryBase):
    project_names: List[Annotated[str, Field(min_length=1, max_length=50)]] = []


class JournalEntry(JournalEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    projects: List[Project] = []


# ── Entry ↔ Todoist task links ────────────────────────────────────────────────

class EntryTaskLink(BaseModel):
    todoist_task_id: str


class EntryTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    todoist_task_id: str
    created_at: datetime