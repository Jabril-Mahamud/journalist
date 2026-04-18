from sqlalchemy import Column, Integer, String, Text, DateTime, Table, ForeignKey, Boolean, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

entry_projects = Table(
    'entry_projects',
    Base.metadata,
    Column('entry_id', Integer, ForeignKey('journal_entries.id'), primary_key=True),
    Column('project_id', Integer, ForeignKey('projects.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    todoist_token = Column(String(255), nullable=True)

    entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, index=True)
    color = Column(String(7), nullable=False, default="#6366f1", server_default="#6366f1")
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="projects")
    entries = relationship("JournalEntry", secondary=entry_projects, back_populates="projects")

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="entries")
    projects = relationship("Project", secondary=entry_projects, back_populates="entries")
    entry_tasks = relationship("EntryTask", back_populates="entry", cascade="all, delete-orphan")

class EntryTask(Base):
    """Links a Todoist task ID to a journal entry."""
    __tablename__ = "entry_tasks"

    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey('journal_entries.id'), nullable=False)
    todoist_task_id = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    entry = relationship("JournalEntry", back_populates="entry_tasks")


class Template(Base):
    """
    A reusable entry template. Can be user-created, built-in, or forked from another.

    trigger_conditions JSON shape:
    {
        "type": "manual" | "project" | "day_of_week" | "time_of_day" | "date_pattern",
        "project_id": 123,                                  # for type=project
        "days": [0, 1, 2, 3, 4],                           # for type=day_of_week (Mon=0)
        "time": "morning" | "evening",                     # for type=time_of_day
        "date_pattern": "first_of_month" | "last_of_month" # for type=date_pattern
    }
    """
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)   # NULL for built-ins
    forked_from_id = Column(Integer, ForeignKey('templates.id'), nullable=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    icon = Column(String(10), nullable=True)
    content = Column(Text, nullable=False)
    tags = Column(JSON, nullable=False, default=list)
    trigger_conditions = Column(JSON, nullable=True)
    is_public = Column(Boolean, nullable=False, default=False, server_default='false')
    is_built_in = Column(Boolean, nullable=False, default=False, server_default='false')
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="templates")
    forked_from = relationship("Template", remote_side="Template.id")