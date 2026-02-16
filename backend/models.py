from sqlalchemy import Column, Integer, String, Text, DateTime, Table, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

# Association table for many-to-many relationship
entry_focus_points = Table(
    'entry_focus_points',
    Base.metadata,
    Column('entry_id', Integer, ForeignKey('journal_entries.id'), primary_key=True),
    Column('focus_point_id', Integer, ForeignKey('focus_points.id'), primary_key=True)
)

class FocusPoint(Base):
    __tablename__ = "focus_points"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to entries
    entries = relationship("JournalEntry", secondary=entry_focus_points, back_populates="focus_points")

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to focus points
    focus_points = relationship("FocusPoint", secondary=entry_focus_points, back_populates="entries")