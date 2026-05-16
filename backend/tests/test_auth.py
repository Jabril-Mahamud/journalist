import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
from database import get_db
from main import app


def test_no_token_returns_401(client):
    response = client.get("/api/entries/")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


def test_malformed_token_returns_401(client):
    response = client.get(
        "/api/entries/",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401


def test_auto_create_user_on_first_auth(client, db):
    """Verify that get_current_user auto-creates a user row."""
    from auth import get_current_user

    def _mock_user():
        # Simulate what get_current_user does after JWT verification
        user = db.query(models.User).filter(
            models.User.clerk_user_id == "new_user_999"
        ).first()
        if not user:
            user = models.User(clerk_user_id="new_user_999", email="new@example.com")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    app.dependency_overrides[get_current_user] = _mock_user
    app.dependency_overrides[get_db] = lambda: (yield db)

    response = client.get("/api/entries/")
    assert response.status_code == 200

    users = db.query(models.User).filter_by(clerk_user_id="new_user_999").all()
    assert len(users) == 1

    app.dependency_overrides.clear()
