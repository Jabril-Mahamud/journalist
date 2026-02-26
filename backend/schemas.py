from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List, Annotated


class UserBase(BaseModel):
    clerk_user_id: str
    email: Optional[str] = None

class User(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str = Field(default="#6366f1", pattern=r'^#[0-9a-fA-F]{6}$')

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    color: str = Field(pattern=r'^#[0-9a-fA-F]{6}$')

class Project(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class JournalEntryBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=100000)

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

class EntryTaskLink(BaseModel):
    todoist_task_id: str

class EntryTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    todoist_task_id: str
    created_at: datetime


class TemplateBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    icon: Optional[str] = Field(default=None, max_length=10)
    content: str = Field(min_length=1, max_length=100000)
    tags: List[str] = []
    trigger_conditions: Optional[dict] = None
    is_public: bool = False

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(TemplateBase):
    pass

class Template(TemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    forked_from_id: Optional[int] = None
    is_built_in: bool
    created_at: datetime