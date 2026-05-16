import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
from auth import get_current_user
from main import app


def test_create_entry(auth_client, db):
    response = auth_client.post(
        "/api/entries/",
        json={
            "title": "Test Entry",
            "content": "This is my journal entry",
            "project_names": []
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Entry"
    assert data["content"] == "This is my journal entry"
    assert "id" in data


def test_create_entry_auto_creates_projects(auth_client, db):
    response = auth_client.post(
        "/api/entries/",
        json={
            "title": "Test Entry",
            "content": "Content",
            "project_names": ["work", "personal"]
        }
    )
    assert response.status_code == 201

    projects = db.query(models.Project).all()
    assert len(projects) == 2
    project_names = [p.name for p in projects]
    assert "work" in project_names
    assert "personal" in project_names
    
    entry_id = response.json()["id"]
    entry = db.query(models.JournalEntry).filter_by(id=entry_id).first()
    assert len(entry.projects) == 2


def test_list_entries(auth_client, db):
    auth_client.post("/api/entries/", json={"title": "Entry 1", "content": "Content 1", "project_names": []})
    auth_client.post("/api/entries/", json={"title": "Entry 2", "content": "Content 2", "project_names": []})
    
    response = auth_client.get("/api/entries/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_user_cannot_see_other_users_entries(auth_client, db, second_user):
    auth_client.post("/api/entries/", json={"title": "User 1 Entry", "content": "Content", "project_names": []})
    
    def _get_second_user_override():
        return second_user
    app.dependency_overrides[get_current_user] = _get_second_user_override
    
    response = auth_client.get("/api/entries/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


def test_get_single_entry(auth_client, db):
    create_response = auth_client.post(
        "/api/entries/",
        json={"title": "Test Entry", "content": "Content", "project_names": []}
    )
    entry_id = create_response.json()["id"]
    
    response = auth_client.get(f"/api/entries/{entry_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Test Entry"


def test_update_entry(auth_client, db):
    create_response = auth_client.post(
        "/api/entries/",
        json={"title": "Original Title", "content": "Original Content", "project_names": []}
    )
    entry_id = create_response.json()["id"]
    
    response = auth_client.put(
        f"/api/entries/{entry_id}",
        json={"title": "Updated Title", "content": "Updated Content", "project_names": []}
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"
    assert response.json()["content"] == "Updated Content"


def test_update_entry_projects(auth_client, db):
    create_response = auth_client.post(
        "/api/entries/",
        json={"title": "Entry", "content": "Content", "project_names": ["work"]}
    )
    entry_id = create_response.json()["id"]
    
    response = auth_client.put(
        f"/api/entries/{entry_id}",
        json={"title": "Entry", "content": "Content", "project_names": ["personal", "ideas"]}
    )
    assert response.status_code == 200
    
    entry = db.query(models.JournalEntry).filter_by(id=entry_id).first()
    project_names = [p.name for p in entry.projects]
    assert len(project_names) == 2
    assert "personal" in project_names
    assert "ideas" in project_names
    assert "work" not in project_names


def test_delete_entry(auth_client, db):
    create_response = auth_client.post(
        "/api/entries/",
        json={"title": "To Delete", "content": "Content", "project_names": []}
    )
    entry_id = create_response.json()["id"]
    
    response = auth_client.delete(f"/api/entries/{entry_id}")
    assert response.status_code == 200
    
    entries = db.query(models.JournalEntry).all()
    assert len(entries) == 0


def test_get_nonexistent_entry_returns_404(auth_client):
    response = auth_client.get("/api/entries/999")
    assert response.status_code == 404


def test_update_nonexistent_entry_returns_404(auth_client):
    response = auth_client.put("/api/entries/999", json={"title": "Test", "content": "Test", "project_names": []})
    assert response.status_code == 404


def test_delete_nonexistent_entry_returns_404(auth_client):
    response = auth_client.delete("/api/entries/999")
    assert response.status_code == 404


def test_deleting_user_cascades_to_entries(db, test_user):
    entry = models.JournalEntry(
        title="Test", content="Content", user_id=test_user.id
    )
    db.add(entry)
    db.commit()

    db.delete(test_user)
    db.commit()

    entries = db.query(models.JournalEntry).all()
    assert len(entries) == 0
