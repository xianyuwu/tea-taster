import pytest

pytestmark = pytest.mark.asyncio


async def test_get_teas_empty(client, admin_token):
    resp = await client.get("/api/teas", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_tea(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post("/api/teas", json={"name": "大红袍"}, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "大红袍"
    assert isinstance(data["scores"], dict)
    assert "id" in data


async def test_create_duplicate_tea(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    await client.post("/api/teas", json={"name": "肉桂"}, headers=h)
    resp = await client.post("/api/teas", json={"name": "肉桂"}, headers=h)
    assert resp.status_code == 409


async def test_update_tea(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post("/api/teas", json={"name": "水仙"}, headers=h)
    tea_id = resp.json()["id"]

    resp = await client.put(f"/api/teas/{tea_id}", json={"name": "老丛水仙"}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["name"] == "老丛水仙"


async def test_update_tea_scores(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post("/api/teas", json={"name": "白鸡冠"}, headers=h)
    tea_id = resp.json()["id"]

    scores = {"aroma": 4, "color": 3, "body": 5}
    resp = await client.put(f"/api/teas/{tea_id}", json={"scores": scores}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["scores"]["aroma"] == 4


async def test_update_tea_note(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post("/api/teas", json={"name": "铁罗汉"}, headers=h)
    tea_id = resp.json()["id"]

    resp = await client.put(f"/api/teas/{tea_id}", json={"note": "岩韵明显"}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["note"] == "岩韵明显"


async def test_update_tea_with_extra_fields(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post("/api/teas", json={"name": "半天腰", "variety": "乌龙", "price": 500}, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["variety"] == "乌龙"
    assert data["price"] == 500


async def test_delete_tea(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post("/api/teas", json={"name": "金锁匙"}, headers=h)
    tea_id = resp.json()["id"]

    resp = await client.delete(f"/api/teas/{tea_id}", headers=h)
    assert resp.status_code == 204


async def test_delete_nonexistent_tea(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.delete("/api/teas/9999", headers=h)
    assert resp.status_code == 404


async def test_get_report_empty(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.get("/api/report", headers=h)
    assert resp.status_code == 200
    assert resp.json() is None
