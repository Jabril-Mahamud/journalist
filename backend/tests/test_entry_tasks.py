import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models


def test_link_task_to_entry(auth_client, db):
    entry_response = auth_client.post(
        "/api/entries/",
        json={"title": "Test Entry", "content": "Content", "project_names": []}
    )
    entry_id = entry_response.json()["id"]
    
    response = auth_client.post(
        f"/api/entries/{entry_id}/tasks",
        json={"todoist_task_id": "task_123"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["todoist_task_id"] == "task_123"
    assert "id" in data


def test_link_same_task_twice_no_duplicate(auth_client, db):
    entry_response = auth_client.post(
        "/api/entries/",
        json={"title": "Test Entry", "content": "Content", "project_names": []}
    )
    entry_id = entry_response.json()["id"]
    
    response1 = auth_client.post(
        f"/api/entries/{entry_id}/tasks",
        json={"todoist_task_id": "task_123"}
    )
    assert response1.status_code == 201

    response2 = auth_client.post(
        f"/api/entries/{entry_id}/tasks",
        json={"todoist_task_id": "task_123"}
    )
    assert response2.status_code == 201
    assert response1.json()["id"] == response2.json()["id"]
    
    tasks = db.query(models.EntryTask).filter_by(entry_id=entry_id).all()
    assert len(tasks) == 1


def test_list_entry_tasks(auth_client, db):
    entry_response = auth_client.post(
        "/api/entries/",
        json={"title": "Test Entry", "content": "Content", "project_names": []}
    )
    entry_id = entry_response.json()["id"]
    
    auth_client.post(f"/api/entries/{entry_id}/tasks", json={"todoist_task_id": "task_1"})
    auth_client.post(f"/api/entries/{entry_id}/tasks", json={"todoist_task_id": "task_2"})
    
    response = auth_client.get(f"/api/entries/{entry_id}/tasks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    task_ids = [t["todoist_task_id"] for t in data]
    assert "task_1" in task_ids
    assert "task_2" in task_ids


def test_unlink_task_from_entry(auth_client, db):
    entry_response = auth_client.post(
        "/api/entries/",
        json={"title": "Test Entry", "content": "Content", "project_names": []}
    )
    entry_id = entry_response.json()["id"]
    
    auth_client.post(f"/api/entries/{entry_id}/tasks", json={"todoist_task_id": "task_123"})
    
    response = auth_client.delete(f"/api/entries/{entry_id}/tasks/task_123")
    assert response.status_code == 200
    assert response.json() == {"unlinked": True}
    
    tasks = db.query(models.EntryTask).filter_by(entry_id=entry_id).all()
    assert len(tasks) == 0


def test_link_task_to_nonexistent_entry_returns_404(auth_client):
    response = auth_client.post(
        "/api/entries/999/tasks",
        json={"todoist_task_id": "task_123"}
    )
    assert response.status_code == 404


def test_list_tasks_for_nonexistent_entry_returns_404(auth_client):
    response = auth_client.get("/api/entries/999/tasks")
    assert response.status_code == 404


def test_unlink_task_from_nonexistent_entry_returns_404(auth_client):
    response = auth_client.delete("/api/entries/999/tasks/task_123")
    assert response.status_code == 404
