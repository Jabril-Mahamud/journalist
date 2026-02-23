def test_no_token_returns_401(client):
    response = client.get("/entries/")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


def test_malformed_token_returns_401(client):
    response = client.get(
        "/entries/",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
