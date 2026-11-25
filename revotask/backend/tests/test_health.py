def test_health_returns_data_envelope(client):
    """REQ-FND-1: GET /api/health returns 200 with the data envelope."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"data": {"status": "ok", "database": "up"}}


def test_health_is_public(client):
    """REQ-FND-1: the health check needs no token."""
    assert client.get("/api/health", headers={}).status_code == 200


def test_unknown_route_uses_error_envelope(client):
    """REQ-FND-2: unknown routes return the JSON error envelope, not HTML."""
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Resource not found", "code": "NOT_FOUND"}


def test_wrong_method_uses_error_envelope(client):
    """REQ-FND-2: 405 also uses the envelope."""
    response = client.delete("/api/health")
    assert response.status_code == 405
    assert response.get_json()["code"] == "METHOD_NOT_ALLOWED"
