import json
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import BASE_DIR, DEFAULT_DIMENSIONS, DEFAULT_TEA_FIELDS, DEFAULT_DERIVED_METRICS
from app.models import ConfigItem

_JSON_KEYS = {"dimensions", "teaFields", "derivedMetrics"}


async def load_config(db: AsyncSession) -> dict:
    result = await db.execute(select(ConfigItem))
    items = result.scalars().all()
    config = {}
    for item in items:
        if item.key in _JSON_KEYS:
            try:
                config[item.key] = json.loads(item.value)
            except (json.JSONDecodeError, TypeError):
                config[item.key] = item.value
        else:
            config[item.key] = item.value
    return config


async def save_config(db: AsyncSession, cfg: dict):
    for key, value in cfg.items():
        if key in _JSON_KEYS or isinstance(value, (dict, list)):
            value_str = json.dumps(value, ensure_ascii=False)
        else:
            value_str = str(value) if value is not None else ""

        result = await db.execute(select(ConfigItem).where(ConfigItem.key == key))
        item = result.scalar_one_or_none()
        if item:
            item.value = value_str
        else:
            db.add(ConfigItem(key=key, value=value_str))
    await db.commit()


async def get_api_key(db: AsyncSession) -> str:
    key = os.environ.get("OPENAI_API_KEY", "")
    if key:
        return key
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    cfg = await load_config(db)
    return cfg.get("openai_api_key", "")


async def get_key_source(db: AsyncSession) -> str:
    env_key = os.environ.get("OPENAI_API_KEY", "")
    env_file = BASE_DIR / ".env"
    if env_key:
        return "环境变量"
    if env_file.exists() and any(
        l.strip().startswith("OPENAI_API_KEY=") for l in env_file.read_text().splitlines()
    ):
        return ".env 文件"
    cfg = await load_config(db)
    if cfg.get("openai_api_key"):
        return "数据库配置（建议迁移到 .env）"
    return ""


def mask_key(key: str) -> str:
    if not key or len(key) < 8:
        return "***"
    return key[:3] + "*" * (len(key) - 7) + key[-4:]


async def get_dimensions(db: AsyncSession) -> list[dict]:
    cfg = await load_config(db)
    dims = cfg.get("dimensions")
    return dims if dims else DEFAULT_DIMENSIONS


async def get_tea_fields(db: AsyncSession) -> list[dict]:
    cfg = await load_config(db)
    fields = cfg.get("teaFields")
    return fields if fields else DEFAULT_TEA_FIELDS


async def get_derived_metrics(db: AsyncSession) -> list[dict]:
    cfg = await load_config(db)
    metrics = cfg.get("derivedMetrics")
    return metrics if metrics else DEFAULT_DERIVED_METRICS


def save_api_key_to_env(api_key: str):
    env_file = BASE_DIR / ".env"
    lines = []
    if env_file.exists():
        lines = [l for l in env_file.read_text().splitlines() if not l.strip().startswith("OPENAI_API_KEY=")]
    lines.append(f"OPENAI_API_KEY={api_key}")
    env_file.write_text("\n".join(lines) + "\n")
    os.environ["OPENAI_API_KEY"] = api_key
