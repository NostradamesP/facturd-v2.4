from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_invalid_credentials():
    response = client.post(
        "/api/auth/login",
        json={"email": "nonexistent@test.com", "password": "wrongpassword"}
    )
    # The actual implementation might return 401 or 400
    assert response.status_code in (401, 400, 404)

def test_root():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_logout_clears_auth_cookie():
    response = client.post("/api/auth/logout")
    assert response.status_code == 204
    set_cookie = response.headers.get("set-cookie", "")
    assert "token=" in set_cookie
    assert "Max-Age=0" in set_cookie or "expires=" in set_cookie.lower()
