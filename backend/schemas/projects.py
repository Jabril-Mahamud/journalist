# backend/schemas/projects.py

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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