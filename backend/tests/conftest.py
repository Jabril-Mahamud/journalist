import pytest
import os
import sys
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
from database import get_db
from main import app
from auth import get_current_user

SQLALCHEMY_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {},
    poolclass=StaticPool if "sqlite" in SQLALCHEMY_DATABASE_URL else None,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    models.Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    session.begin_nested()
    
    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        if transaction.nested and not transaction._parent.nested:
            session.expire_all()
            session.begin_nested()
    
    yield session
    
    session.rollback()
    session.close()
    models.Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    def _get_db_override():
        yield db
    
    app.dependency_overrides[get_db] = _get_db_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db: Session):
    user = models.User(
        clerk_user_id="test_user_123",
        email="test@example.com"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def second_user(db: Session):
    user = models.User(
        clerk_user_id="test_user_456",
        email="test2@example.com"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_client(db, test_user):
    def _get_db_override():
        yield db
    
    def _get_current_user_override():
        return test_user
    
    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = _get_current_user_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
