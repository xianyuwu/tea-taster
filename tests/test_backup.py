import io
import pytest

pytestmark = pytest.mark.asyncio


async def test_create_backup(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post("/api/backup", headers=h)
    assert resp.status_code == 200


async def test_list_backups(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    await client.post("/api/backup", headers=h)
    resp = await client.get("/api/backups", headers=h)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


async def test_delete_backup(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    await client.post("/api/backup", headers=h)
    resp = await client.get("/api/backups", headers=h)
    filename = resp.json()[0]["filename"]

    resp = await client.delete(f"/api/backups/{filename}", headers=h)
    assert resp.status_code == 204


async def test_restore_invalid_file(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    fake_zip = io.BytesIO(b"not a zip file")
    resp = await client.post("/api/restore",
        files={"file": ("test.zip", fake_zip, "application/zip")},
        headers=h,
    )
    # Should fail with bad zip
    assert resp.status_code in (400, 500)
