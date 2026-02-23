import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import patch, MagicMock
import models


def test_todoist_status_not_connected(auth_client, db, test_user):
    response = auth_client.get("/todoist/status")
    assert response.status_code == 200
    assert response.json() == {"connected": False}


def test_todoist_status_connected(auth_client, db, test_user):
    test_user.todoist_token = "valid_token"
    db.commit()
    
    response = auth_client.get("/todoist/status")
    assert response.status_code == 200
    assert response.json() == {"connected": True}


@patch("routers.todoist.http_requests")
def test_save_todoist_token_invalid(mock_http, auth_client, db, test_user):
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_http.get.return_value = mock_response
    
    response = auth_client.put("/todoist/token", json={"token": "invalid_token"})
    assert response.status_code == 400
    assert "Invalid Todoist API token" in response.json()["detail"]


@patch("routers.todoist.http_requests")
def test_save_todoist_token_valid(mock_http, auth_client, db, test_user):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.ok = True
    mock_http.get.return_value = mock_response
    
    response = auth_client.put("/todoist/token", json={"token": "valid_token"})
    assert response.status_code == 200
    assert response.json() == {"connected": True}
    
    db.refresh(test_user)
    assert test_user.todoist_token == "valid_token"


def test_delete_todoist_token(auth_client, db, test_user):
    test_user.todoist_token = "existing_token"
    db.commit()
    
    response = auth_client.delete("/todoist/token")
    assert response.status_code == 200
    assert response.json() == {"connected": False}
    
    db.refresh(test_user)
    assert test_user.todoist_token is None


@patch("routers.todoist.http_requests")
def test_get_todoist_tasks(mock_http, auth_client, db, test_user):
    test_user.todoist_token = "valid_token"
    db.commit()
    
    mock_tasks_response = MagicMock()
    mock_tasks_response.status_code = 200
    mock_tasks_response.ok = True
    mock_tasks_response.json.return_value = [
        {"id": "1", "content": "Task 1", "description": "", "is_completed": False, "priority": 1, "due": None, "project_id": "proj1", "url": ""}
    ]
    
    mock_projects_response = MagicMock()
    mock_projects_response.status_code = 200
    mock_projects_response.ok = True
    mock_projects_response.json.return_value = [
        {"id": "proj1", "name": "Inbox"}
    ]
    
    mock_http.get.side_effect = [mock_tasks_response, mock_projects_response]
    
    response = auth_client.get("/todoist/tasks")
    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 1
    assert tasks[0]["content"] == "Task 1"
    assert tasks[0]["project_name"] == "Inbox"


@patch("routers.todoist.http_requests")
def test_close_todoist_task(mock_http, auth_client, db, test_user):
    test_user.todoist_token = "valid_token"
    db.commit()
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.ok = True
    mock_http.post.return_value = mock_response
    
    response = auth_client.post("/todoist/tasks/123/close")
    assert response.status_code == 200
    assert response.json() == {"closed": True}
