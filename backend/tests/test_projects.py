import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
from auth import get_current_user
from main import app


def test_create_project(auth_client, db):
    response = auth_client.post("/projects/", json={"name": "work", "color": "#ff0000"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "work"
    assert data["color"] == "#ff0000"
    assert "id" in data


def test_create_duplicate_project_returns_existing(auth_client, db):
    response1 = auth_client.post("/projects/", json={"name": "work"})
    assert response1.status_code == 200
    
    response2 = auth_client.post("/projects/", json={"name": "work"})
    assert response2.status_code == 200
    
    assert response1.json()["id"] == response2.json()["id"]
    
    projects = db.query(models.Project).all()
    assert len(projects) == 1


def test_list_projects(auth_client, db, test_user):
    auth_client.post("/projects/", json={"name": "work"})
    auth_client.post("/projects/", json={"name": "personal"})
    
    response = auth_client.get("/projects/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = [p["name"] for p in data]
    assert "work" in names
    assert "personal" in names


def test_user_cannot_see_other_users_projects(auth_client, db, second_user):
    auth_client.post("/projects/", json={"name": "user1_project"})
    
    def _get_second_user_override():
        return second_user
    app.dependency_overrides[get_current_user] = _get_second_user_override
    
    response = auth_client.get("/projects/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


def test_update_project_color(auth_client, db):
    create_response = auth_client.post("/projects/", json={"name": "work"})
    project_id = create_response.json()["id"]
    
    response = auth_client.patch(f"/projects/{project_id}", json={"color": "#00ff00"})
    assert response.status_code == 200
    assert response.json()["color"] == "#00ff00"


def test_delete_project(auth_client, db):
    create_response = auth_client.post("/projects/", json={"name": "work"})
    project_id = create_response.json()["id"]
    
    response = auth_client.delete(f"/projects/{project_id}")
    assert response.status_code == 200
    
    projects = db.query(models.Project).all()
    assert len(projects) == 0


def test_delete_project_removes_from_entries(auth_client, db, test_user):
    project_response = auth_client.post("/projects/", json={"name": "work"})
    project_id = project_response.json()["id"]
    
    entry_response = auth_client.post(
        "/entries/",
        json={"title": "Test Entry", "content": "Content", "project_names": ["work"]}
    )
    entry_id = entry_response.json()["id"]
    
    auth_client.delete(f"/projects/{project_id}")
    
    entry = db.query(models.JournalEntry).filter_by(id=entry_id).first()
    assert len(entry.projects) == 0


def test_update_nonexistent_project_returns_404(auth_client):
    response = auth_client.patch("/projects/999", json={"color": "#00ff00"})
    assert response.status_code == 404


def test_delete_nonexistent_project_returns_404(auth_client):
    response = auth_client.delete("/projects/999")
    assert response.status_code == 404
