from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class UserBase(BaseModel):
    clerk_user_id: str
    email: Optional[str] = None

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class FocusPointBase(BaseModel):
    name: str

class FocusPointCreate(FocusPointBase):
    pass

class FocusPoint(FocusPointBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class JournalEntryBase(BaseModel):
    title: str
    content: str

class JournalEntryCreate(JournalEntryBase):
    focus_point_names: List[str] = []

class JournalEntryUpdate(JournalEntryBase):
    focus_point_names: List[str] = []

class JournalEntry(JournalEntryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    focus_points: List[FocusPoint] = []
    
    class Config:
        from_attributes = True