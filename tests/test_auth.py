import pytest

pytestmark = pytest.mark.asyncio


async def test_login_success(client, admin_token):
    resp = await client.post("/api/auth/login", json={
        "username": "admin",
        "password": "testpass123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client):
    resp = await client.post("/api/auth/login", json={
        "username": "admin",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


async def test_login_nonexistent_user(client):
    resp = await client.post("/api/auth/login", json={
        "username": "nonexistent",
        "password": "testpass123",
    })
    assert resp.status_code == 401


async def test_get_me(client, admin_token):
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "admin"
    assert data["role"] == "admin"


async def test_get_me_unauthorized(client):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


async def test_register_first_rejected(client, admin_token):
    resp = await client.post("/api/auth/register-first", json={
        "username": "second",
        "password": "testpass123",
    })
    assert resp.status_code == 400


async def test_change_password(client, admin_token):
    resp = await client.put("/api/auth/password",
        json={"old_password": "testpass123", "new_password": "newpass456"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200

    resp = await client.post("/api/auth/login", json={
        "username": "admin",
        "password": "newpass456",
    })
    assert resp.status_code == 200


async def test_change_password_wrong_old(client, admin_token):
    resp = await client.put("/api/auth/password",
        json={"old_password": "wrongold", "new_password": "another789"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400
