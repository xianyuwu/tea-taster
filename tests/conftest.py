import asyncio
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///file::memory:?cache=shared&uri=true"

from app import create_app
from app.db import engine
from app.models import Base


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def app():
    application = create_app()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield application
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="session")
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest_asyncio.fixture(scope="session")
async def admin_token(client):
    resp = await client.post("/api/auth/register-first", json={
        "username": "admin",
        "password": "testpass123",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]
