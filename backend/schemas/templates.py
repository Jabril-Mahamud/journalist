# backend/schemas/templates.py

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TemplateBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    icon: Optional[str] = Field(default=None, max_length=10)
    content: str = Field(min_length=1, max_length=100_000)
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