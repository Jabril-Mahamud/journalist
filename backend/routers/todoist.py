import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List

import schemas
import models
from database import get_db
from auth import get_current_user

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/todoist", tags=["todoist"])

TODOIST_API = "https://api.todoist.com/api/v1"


def _todoist_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _get_todoist_token(current_user: models.User) -> str:
    if not current_user.todoist_token:
        raise HTTPException(status_code=400, detail="Todoist account not connected")
    return current_user.todoist_token


@router.get("/status", response_model=schemas.TodoistTokenStatus)
def todoist_status(current_user: models.User = Depends(get_current_user)):
    return {"connected": bool(current_user.todoist_token)}


@router.put("/token")
@limiter.limit("10/minute")
def save_todoist_token(
    request: Request,
    body: schemas.TodoistTokenSave,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    resp = http_requests.get(
        f"{TODOIST_API}/projects",
        headers=_todoist_headers(body.token),
        timeout=10,
    )
    if resp.status_code == 401:
        raise HTTPException(status_code=400, detail="Invalid Todoist API token")
    if not resp.ok:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Todoist: {resp.status_code} {resp.text}"
        )
    current_user.todoist_token = body.token
    db.commit()
    return {"connected": True}


@router.delete("/token")
def delete_todoist_token(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    current_user.todoist_token = None
    db.commit()
    return {"connected": False}


@router.get("/tasks", response_model=List[schemas.TodoistTask])
def get_todoist_tasks(
    current_user: models.User = Depends(get_current_user),
):
    token = _get_todoist_token(current_user)

    resp = http_requests.get(
        f"{TODOIST_API}/tasks",
        headers=_todoist_headers(token),
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Todoist: {resp.status_code} {resp.text}"
        )

    proj_resp = http_requests.get(
        f"{TODOIST_API}/projects",
        headers=_todoist_headers(token),
        timeout=10,
    )
    project_names: dict = {}
    if proj_resp.ok:
        data = proj_resp.json()
        projects = data if isinstance(data, list) else data.get("results", [])
        project_names = {p["id"]: p["name"] for p in projects}

    tasks = []
    data = resp.json()
    items = data if isinstance(data, list) else data.get("results", [])
    for t in items:
        tasks.append(schemas.TodoistTask(
            id=t["id"],
            content=t["content"],
            description=t.get("description", ""),
            is_completed=t.get("is_completed", False),
            priority=t.get("priority", 1),
            due=t.get("due"),
            project_id=t.get("project_id"),
            project_name=project_names.get(t.get("project_id", ""), None),
            url=t.get("url", ""),
        ))
    return tasks


@router.post("/tasks/{task_id}/close")
@limiter.limit("60/minute")
def close_todoist_task(
    request: Request,
    task_id: str,
    current_user: models.User = Depends(get_current_user),
):
    token = _get_todoist_token(current_user)

    resp = http_requests.post(
        f"{TODOIST_API}/tasks/{task_id}/close",
        headers=_todoist_headers(token),
        timeout=10,
    )
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Task not found in Todoist")
    if not resp.ok:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Todoist: {resp.status_code} {resp.text}"
        )
    return {"closed": True}


@router.patch("/tasks/{task_id}/reschedule")
@limiter.limit("60/minute")
def reschedule_todoist_task(
    request: Request,
    task_id: str,
    body: schemas.TodoistReschedule,
    current_user: models.User = Depends(get_current_user),
):
    """Update a task's due date. Body: { "due_date": "YYYY-MM-DD" }"""
    token = _get_todoist_token(current_user)

    resp = http_requests.post(
        f"{TODOIST_API}/tasks/{task_id}",
        headers=_todoist_headers(token),
        json={"due_date": body.due_date},
        timeout=10,
    )
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Task not found in Todoist")
    if not resp.ok:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Todoist: {resp.status_code} {resp.text}"
        )
    return {"rescheduled": True, "due_date": body.due_date}