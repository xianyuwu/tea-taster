import pytest

pytestmark = pytest.mark.asyncio


async def test_get_config(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.get("/api/config", headers=h)
    assert resp.status_code == 200


async def test_save_config(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.put("/api/config", json={
        "openai_model": "gpt-4o",
        "openai_base_url": "https://api.openai.com/v1",
    }, headers=h)
    assert resp.status_code == 200


async def test_get_dimensions(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.get("/api/dimensions", headers=h)
    assert resp.status_code == 200
    dims = resp.json()
    assert isinstance(dims, list)
    assert len(dims) == 7  # default dimensions


async def test_save_dimensions(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    new_dims = [
        {"key": "aroma", "name": "香气", "desc": "闻起来是否好闻"},
        {"key": "taste", "name": "口感", "desc": "入口味道"},
    ]
    resp = await client.put("/api/dimensions", json={"dimensions": new_dims}, headers=h)
    assert resp.status_code == 200

    resp = await client.get("/api/dimensions", headers=h)
    assert len(resp.json()) == 2


async def test_get_tea_fields(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.get("/api/tea-fields", headers=h)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_save_tea_fields(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    fields = [
        {"key": "variety", "label": "品种", "type": "text"},
        {"key": "price", "label": "价格", "type": "number", "unit": "元"},
    ]
    resp = await client.put("/api/tea-fields", json={"teaFields": fields}, headers=h)
    assert resp.status_code == 200


async def test_get_derived_metrics(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.get("/api/derived-metrics", headers=h)
    assert resp.status_code == 200


async def test_save_derived_metrics(client, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    metrics = [
        {"key": "unitPrice", "label": "单价", "numerator": "price",
         "denominator": "weight", "unit": "元/克", "minRequired": 2, "colorMap": True},
    ]
    resp = await client.put("/api/derived-metrics", json={"derivedMetrics": metrics}, headers=h)
    assert resp.status_code == 200
