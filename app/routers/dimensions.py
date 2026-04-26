from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services import config_service
from app.utils.errors import AppError

router = APIRouter()


@router.get("/api/dimensions")
async def get_dims(db: AsyncSession = Depends(get_db)):
    return await config_service.get_dimensions(db)


@router.put("/api/dimensions")
async def update_dims(body: dict, db: AsyncSession = Depends(get_db)):
    dims = body.get("dimensions")
    if not isinstance(dims, list) or not dims:
        raise AppError("维度列表不能为空")
    for d in dims:
        if not d.get("key") or not d.get("name"):
            raise AppError("每个维度必须有 key 和 name")
    cfg = await config_service.load_config(db)
    cfg["dimensions"] = dims
    await config_service.save_config(db, cfg)
    return {"message": "评分维度已保存"}


@router.get("/api/tea-fields")
async def get_tea_fields_api(db: AsyncSession = Depends(get_db)):
    return await config_service.get_tea_fields(db)


@router.put("/api/tea-fields")
async def update_tea_fields_api(body: dict, db: AsyncSession = Depends(get_db)):
    fields = body.get("teaFields")
    if not isinstance(fields, list):
        raise AppError("字段列表格式错误")
    for f in fields:
        if not f.get("key") or not f.get("label"):
            raise AppError("每个字段必须有 key 和 label")
    keys = [f["key"] for f in fields]
    if len(keys) != len(set(keys)):
        raise AppError("字段 key 不能重复")
    cfg = await config_service.load_config(db)
    cfg["teaFields"] = fields
    await config_service.save_config(db, cfg)
    return {"message": "茶样字段已保存"}


@router.get("/api/derived-metrics")
async def get_derived_metrics_api(db: AsyncSession = Depends(get_db)):
    return await config_service.get_derived_metrics(db)


@router.put("/api/derived-metrics")
async def update_derived_metrics_api(body: dict, db: AsyncSession = Depends(get_db)):
    metrics = body.get("derivedMetrics")
    if not isinstance(metrics, list):
        raise AppError("派生指标列表格式错误")
    for m in metrics:
        if not m.get("key") or not m.get("label") or not m.get("numerator") or not m.get("denominator"):
            raise AppError("每个派生指标必须有 key、label、numerator、denominator")
    cfg = await config_service.load_config(db)
    cfg["derivedMetrics"] = metrics
    await config_service.save_config(db, cfg)
    return {"message": "派生指标已保存"}
