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

class FocusPointBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str = Field(default="#6366f1", pattern=r'^#[0-9a-fA-F]{6}$')

class FocusPointCreate(FocusPointBase):
    pass

class FocusPointUpdate(BaseModel):
    color: str = Field(pattern=r'^#[0-9a-fA-F]{6}$')

class FocusPoint(FocusPointBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class JournalEntryBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=100000)

class JournalEntryCreate(JournalEntryBase):
    focus_point_names: List[Annotated[str, Field(min_length=1, max_length=50)]] = []

class JournalEntryUpdate(JournalEntryBase):
    focus_point_names: List[Annotated[str, Field(min_length=1, max_length=50)]] = []

class JournalEntry(JournalEntryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    focus_points: List[FocusPoint] = []
    
    class Config:
        from_attributes = True