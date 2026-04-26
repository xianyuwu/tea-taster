import pytest

pytestmark = pytest.mark.asyncio


async def test_get_notes_empty(client, admin_token):
    resp = await client.get("/api/notes", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_note(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post("/api/notes", json={
        "title": "品鉴笔记",
        "content": "大红袍岩韵悠长",
        "source": "manual",
        "tags": ["武夷岩茶", "大红袍"],
    }, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "品鉴笔记"
    assert data["source"] == "manual"
    assert "武夷岩茶" in data["tags"]


async def test_update_note(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post("/api/notes", json={
        "title": "测试笔记",
        "content": "初始内容",
        "source": "manual",
        "tags": [],
    }, headers=h)
    note_id = resp.json()["id"]

    resp = await client.put(f"/api/notes/{note_id}", json={
        "title": "更新标题",
        "content": "更新内容",
        "tags": ["新标签"],
    }, headers=h)
    assert resp.status_code == 200
    assert resp.json()["title"] == "更新标题"


async def test_delete_note(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post("/api/notes", json={
        "title": "待删除",
        "content": "内容",
        "source": "manual",
        "tags": [],
    }, headers=h)
    note_id = resp.json()["id"]

    resp = await client.delete(f"/api/notes/{note_id}", headers=h)
    assert resp.status_code == 204


async def test_delete_nonexistent_note(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.delete("/api/notes/9999", headers=h)
    assert resp.status_code == 404
