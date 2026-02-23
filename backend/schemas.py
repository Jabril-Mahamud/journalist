from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Annotated

class UserBase(BaseModel):
    clerk_user_id: str
    email: Optional[str] = None

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str = Field(default="#6366f1", pattern=r'^#[0-9a-fA-F]{6}$')

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    color: str = Field(pattern=r'^#[0-9a-fA-F]{6}$')

class Project(ProjectBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class JournalEntryBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=100000)

class JournalEntryCreate(JournalEntryBase):
    project_names: List[Annotated[str, Field(min_length=1, max_length=50)]] = []

class JournalEntryUpdate(JournalEntryBase):
    project_names: List[Annotated[str, Field(min_length=1, max_length=50)]] = []

class JournalEntry(JournalEntryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    projects: List[Project] = []
    
    class Config:
        from_attributes = True

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
    id: int
    todoist_task_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True
