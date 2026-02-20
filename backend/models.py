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

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    focus_points = relationship("FocusPoint", back_populates="user", cascade="all, delete-orphan")

class FocusPoint(Base):
    __tablename__ = "focus_points"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="focus_points")
    entries = relationship("JournalEntry", secondary=entry_focus_points, back_populates="focus_points")

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="entries")
    focus_points = relationship("FocusPoint", secondary=entry_focus_points, back_populates="entries")