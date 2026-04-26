import os

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services import config_service
from app.utils.errors import AppError

router = APIRouter()


@router.get("/api/config")
async def get_config(db: AsyncSession = Depends(get_db)):
    cfg = await config_service.load_config(db)
    api_key = await config_service.get_api_key(db)
    return {
        "openai_api_key_masked": config_service.mask_key(api_key),
        "openai_key_source": await config_service.get_key_source(db),
        "openai_model": cfg.get("openai_model", "gpt-4o"),
        "openai_base_url": cfg.get("openai_base_url", "https://api.openai.com/v1"),
        "system_prompt": cfg.get("system_prompt", ""),
    }


@router.put("/api/config")
async def update_config(body: dict, db: AsyncSession = Depends(get_db)):
    cfg = await config_service.load_config(db)

    if "openai_api_key" in body and body["openai_api_key"]:
        config_service.save_api_key_to_env(body["openai_api_key"])
        cfg.pop("openai_api_key", None)

    if "openai_model" in body:
        cfg["openai_model"] = body["openai_model"]
    if "openai_base_url" in body:
        cfg["openai_base_url"] = body["openai_base_url"]
    if "system_prompt" in body:
        cfg["system_prompt"] = body["system_prompt"]

    await config_service.save_config(db, cfg)
    return {"message": "配置已保存"}


@router.post("/api/config/test")
async def test_config(body: dict | None = None, db: AsyncSession = Depends(get_db)):
    body = body or {}
    cfg = await config_service.load_config(db)

    api_key = body.get("openai_api_key") or await config_service.get_api_key(db)
    base_url = body.get("openai_base_url") or cfg.get("openai_base_url", "https://api.openai.com/v1")
    model = body.get("openai_model") or cfg.get("openai_model", "gpt-4o")

    if not api_key:
        raise AppError("未配置 API Key")

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=base_url)
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "hi"}],
        )
        return {"ok": True, "message": f"连接成功，模型: {model}"}
    except Exception as e:
        raise AppError(str(e))
