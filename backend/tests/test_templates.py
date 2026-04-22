import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
from auth import get_current_user
from main import app


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_template_payload(**overrides):
    base = {
        "name": "My Template",
        "description": "A test template",
        "icon": "📝",
        "content": "## {{date}}\n\nWrite here...",
        "tags": ["daily"],
        "trigger_conditions": None,
        "is_public": False,
    }
    base.update(overrides)
    return base


def seed_builtin(db):
    """Insert a built-in template directly into the DB."""
    t = models.Template(
        user_id=None,
        name="Built-in Template",
        description="A built-in",
        icon="📓",
        content="## Built-in content",
        tags=["built-in"],
        trigger_conditions=None,
        is_public=True,
        is_built_in=True,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def seed_public(db, user):
    """Insert a public user template."""
    t = models.Template(
        user_id=user.id,
        name="Public Template",
        content="## Public",
        tags=[],
        is_public=True,
        is_built_in=False,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


# ─── Create ───────────────────────────────────────────────────────────────────

def test_create_template(auth_client, db):
    response = auth_client.post("/api/templates/", json=make_template_payload())
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Template"
    assert data["icon"] == "📝"
    assert data["tags"] == ["daily"]
    assert data["is_built_in"] is False
    assert "id" in data


def test_create_template_minimal(auth_client, db):
    response = auth_client.post("/api/templates/", json={
        "name": "Minimal",
        "content": "Hello",
        "tags": [],
        "is_public": False,
    })
    assert response.status_code == 201
    assert response.json()["name"] == "Minimal"


def test_create_template_with_trigger(auth_client, db):
    payload = make_template_payload(
        trigger_conditions={"type": "day_of_week", "days": [0, 4]}
    )
    response = auth_client.post("/api/templates/", json=payload)
    assert response.status_code == 201
    assert response.json()["trigger_conditions"] == {"type": "day_of_week", "days": [0, 4]}


# ─── List ─────────────────────────────────────────────────────────────────────

def test_list_templates_empty_includes_builtins(auth_client, db):
    builtin = seed_builtin(db)
    response = auth_client.get("/api/templates/")
    assert response.status_code == 200
    data = response.json()
    ids = [t["id"] for t in data]
    assert builtin.id in ids


def test_list_templates_includes_own_and_builtins(auth_client, db, test_user):
    builtin = seed_builtin(db)
    auth_client.post("/api/templates/", json=make_template_payload(name="Mine"))
    response = auth_client.get("/api/templates/")
    assert response.status_code == 200
    data = response.json()
    names = [t["name"] for t in data]
    assert "Mine" in names
    assert "Built-in Template" in names


def test_list_templates_does_not_include_other_users_templates(auth_client, db, second_user):
    # Create a private template owned by second_user
    other_template = models.Template(
        user_id=second_user.id,
        name="Other User Private",
        content="Secret",
        tags=[],
        is_public=False,
        is_built_in=False,
    )
    db.add(other_template)
    db.commit()

    response = auth_client.get("/api/templates/")
    assert response.status_code == 200
    names = [t["name"] for t in response.json()]
    assert "Other User Private" not in names


# ─── Get single ───────────────────────────────────────────────────────────────

def test_get_own_template(auth_client, db):
    create_resp = auth_client.post("/api/templates/", json=make_template_payload())
    template_id = create_resp.json()["id"]

    response = auth_client.get(f"/api/templates/{template_id}")
    assert response.status_code == 200
    assert response.json()["id"] == template_id


def test_get_builtin_template(auth_client, db):
    builtin = seed_builtin(db)
    response = auth_client.get(f"/api/templates/{builtin.id}")
    assert response.status_code == 200
    assert response.json()["is_built_in"] is True


def test_get_nonexistent_template_returns_404(auth_client):
    response = auth_client.get("/api/templates/999")
    assert response.status_code == 404


def test_get_other_users_template_returns_404(auth_client, db, second_user):
    other = models.Template(
        user_id=second_user.id,
        name="Other",
        content="Content",
        tags=[],
        is_public=False,
        is_built_in=False,
    )
    db.add(other)
    db.commit()

    response = auth_client.get(f"/api/templates/{other.id}")
    assert response.status_code == 404


# ─── Update ───────────────────────────────────────────────────────────────────

def test_update_template(auth_client, db):
    create_resp = auth_client.post("/api/templates/", json=make_template_payload())
    template_id = create_resp.json()["id"]

    updated_payload = make_template_payload(name="Updated Name", content="New content")
    response = auth_client.put(f"/api/templates/{template_id}", json=updated_payload)
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"
    assert response.json()["content"] == "New content"


def test_update_nonexistent_template_returns_404(auth_client):
    response = auth_client.put("/api/templates/999", json=make_template_payload())
    assert response.status_code == 404


def test_cannot_update_builtin_template(auth_client, db):
    builtin = seed_builtin(db)
    response = auth_client.put(f"/api/templates/{builtin.id}", json=make_template_payload())
    assert response.status_code == 404


def test_cannot_update_other_users_template(auth_client, db, second_user):
    other = models.Template(
        user_id=second_user.id,
        name="Other",
        content="Content",
        tags=[],
        is_public=False,
        is_built_in=False,
    )
    db.add(other)
    db.commit()

    response = auth_client.put(f"/api/templates/{other.id}", json=make_template_payload())
    assert response.status_code == 404


# ─── Delete ───────────────────────────────────────────────────────────────────

def test_delete_template(auth_client, db):
    create_resp = auth_client.post("/api/templates/", json=make_template_payload())
    template_id = create_resp.json()["id"]

    response = auth_client.delete(f"/api/templates/{template_id}")
    assert response.status_code == 200

    assert db.query(models.Template).filter_by(id=template_id).first() is None


def test_cannot_delete_builtin_template(auth_client, db):
    builtin = seed_builtin(db)
    response = auth_client.delete(f"/api/templates/{builtin.id}")
    assert response.status_code == 404
    # Verify it still exists
    assert db.query(models.Template).filter_by(id=builtin.id).first() is not None


def test_cannot_delete_other_users_template(auth_client, db, second_user):
    other = models.Template(
        user_id=second_user.id,
        name="Other",
        content="Content",
        tags=[],
        is_public=False,
        is_built_in=False,
    )
    db.add(other)
    db.commit()

    response = auth_client.delete(f"/api/templates/{other.id}")
    assert response.status_code == 404


def test_delete_nonexistent_template_returns_404(auth_client):
    response = auth_client.delete("/api/templates/999")
    assert response.status_code == 404


# ─── Fork ─────────────────────────────────────────────────────────────────────

def test_fork_builtin_template(auth_client, db, test_user):
    builtin = seed_builtin(db)
    response = auth_client.post(f"/api/templates/{builtin.id}/fork")
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == builtin.name
    assert data["is_built_in"] is False
    assert data["forked_from_id"] == builtin.id
    assert data["user_id"] == test_user.id


def test_fork_public_template(auth_client, db, test_user, second_user):
    public = seed_public(db, second_user)
    response = auth_client.post(f"/api/templates/{public.id}/fork")
    assert response.status_code == 201
    data = response.json()
    assert data["forked_from_id"] == public.id
    assert data["user_id"] == test_user.id
    assert data["is_public"] is False  # fork starts private


def test_cannot_fork_private_other_user_template(auth_client, db, second_user):
    private = models.Template(
        user_id=second_user.id,
        name="Private",
        content="Secret",
        tags=[],
        is_public=False,
        is_built_in=False,
    )
    db.add(private)
    db.commit()

    response = auth_client.post(f"/api/templates/{private.id}/fork")
    assert response.status_code == 404


def test_fork_nonexistent_returns_404(auth_client):
    response = auth_client.post("/api/templates/999/fork")
    assert response.status_code == 404


# ─── Suggestions ──────────────────────────────────────────────────────────────

def test_suggestions_returns_list(auth_client, db):
    response = auth_client.get("/api/templates/suggestions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_suggestions_does_not_include_manual_templates(auth_client, db):
    auth_client.post("/api/templates/", json=make_template_payload(
        name="Manual Only",
        trigger_conditions={"type": "manual"}
    ))
    response = auth_client.get("/api/templates/suggestions")
    names = [t["name"] for t in response.json()]
    assert "Manual Only" not in names