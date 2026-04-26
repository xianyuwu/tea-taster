from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import PHOTO_DIR
from app.models import Tea, Report
from app.services import config_service


def _tea_to_dict(tea: Tea) -> dict:
    result = {
        "id": tea.id,
        "name": tea.name,
        "scores": tea.scores or {},
        "note": tea.note or "",
        "photo": tea.photo or "",
    }
    if tea.extra_fields:
        result.update(tea.extra_fields)
    return result


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


async def get_all_teas(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Tea).order_by(Tea.id))
    return [_tea_to_dict(t) for t in result.scalars().all()]


async def create_tea(db: AsyncSession, body: dict) -> dict:
    name = (body.get("name") or "").strip()
    if not name:
        raise ValueError("缺少茶名")

    existing = await db.execute(select(Tea).where(Tea.name == name))
    if existing.scalar_one_or_none():
        raise ValueError("已有同名茶样")

    dims = await config_service.get_dimensions(db)
    scores = {d["key"]: 0 for d in dims}

    fields = await config_service.get_tea_fields(db)
    extra = {f["key"]: body.get(f["key"], "") for f in fields}

    now = _now()
    tea = Tea(name=name, scores=scores, extra_fields=extra, created_at=now, updated_at=now)
    db.add(tea)
    await _mark_report_stale(db)
    await db.commit()
    await db.refresh(tea)
    return _tea_to_dict(tea)


async def update_tea(db: AsyncSession, tea_id: int, body: dict) -> dict:
    result = await db.execute(select(Tea).where(Tea.id == tea_id))
    tea = result.scalar_one_or_none()
    if not tea:
        raise KeyError(tea_id)

    if "scores" in body:
        tea.scores = {**(tea.scores or {}), **body["scores"]}
        await _mark_report_stale(db)
    if "note" in body:
        tea.note = body["note"]
    if "name" in body and body["name"].strip():
        tea.name = body["name"].strip()

    fields = await config_service.get_tea_fields(db)
    extra = dict(tea.extra_fields or {})
    for f in fields:
        if f["key"] in body:
            extra[f["key"]] = body[f["key"]]
    tea.extra_fields = extra

    tea.updated_at = _now()
    await db.commit()
    await db.refresh(tea)
    return _tea_to_dict(tea)


async def delete_tea(db: AsyncSession, tea_id: int):
    result = await db.execute(select(Tea).where(Tea.id == tea_id))
    tea = result.scalar_one_or_none()
    if not tea:
        raise KeyError(tea_id)

    if tea.photo:
        photo_path = PHOTO_DIR / tea.photo
        if photo_path.exists():
            photo_path.unlink()

    await db.delete(tea)
    await _mark_report_stale(db)
    await db.commit()


async def get_report(db: AsyncSession) -> dict | None:
    result = await db.execute(select(Report).where(Report.id == 1))
    report = result.scalar_one_or_none()
    if not report:
        return None
    return {"content": report.content, "created_at": report.created_at, "stale": report.stale}


async def delete_report(db: AsyncSession):
    result = await db.execute(select(Report).where(Report.id == 1))
    report = result.scalar_one_or_none()
    if report:
        await db.delete(report)
        await db.commit()


async def save_report(db: AsyncSession, content: str):
    result = await db.execute(select(Report).where(Report.id == 1))
    report = result.scalar_one_or_none()
    now = _now()
    if report:
        report.content = content
        report.created_at = now
        report.stale = False
    else:
        db.add(Report(id=1, content=content, created_at=now, stale=False))
    await db.commit()


async def _mark_report_stale(db: AsyncSession):
    result = await db.execute(select(Report).where(Report.id == 1))
    report = result.scalar_one_or_none()
    if report:
        report.stale = True
