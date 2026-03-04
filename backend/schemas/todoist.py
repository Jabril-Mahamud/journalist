# backend/schemas/todoist.py

from typing import Optional

from pydantic import BaseModel, Field


class TodoistTokenSave(BaseModel):
    token: str = Field(min_length=1, max_length=255)


class TodoistTokenStatus(BaseModel):
    connected: bool


class TodoistTask(BaseModel):
    id: str
    content: str
    description: str = ""
    is_completed: bool
    priority: int
    due: Optional[dict] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    url: str = ""


class TodoistReschedule(BaseModel):
    due_date: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')