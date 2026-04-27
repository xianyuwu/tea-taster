from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Note

_DT_FMT = "%Y-%m-%d %H:%M:%S"


def _fmt_dt(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime(_DT_FMT)


def _note_to_dict(note: Note) -> dict:
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "source": note.source,
        "tags": note.tags or [],
        "created_at": _fmt_dt(note.created_at),
        "updated_at": _fmt_dt(note.updated_at),
    }


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def get_all_notes(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Note).order_by(Note.id))
    return [_note_to_dict(n) for n in result.scalars().all()]


async def create_note(db: AsyncSession, body: dict) -> dict:
    content = (body.get("content") or "").strip()
    if not content:
        raise ValueError("笔记内容不能为空")

    now = _now()
    tags = body.get("tags", [])
    if not isinstance(tags, list):
        tags = []
    tags = [str(t).strip() for t in tags if str(t).strip()]

    note = Note(
        title=(body.get("title") or "").strip(),
        content=content,
        source=body.get("source", "manual"),
        tags=tags,
        created_at=now,
        updated_at=now,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return _note_to_dict(note)


async def update_note(db: AsyncSession, note_id: int, body: dict) -> dict:
    content = (body.get("content") or "").strip()
    if not content:
        raise ValueError("笔记内容不能为空")

    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise KeyError(note_id)

    note.title = (body.get("title") or "").strip()
    note.content = content
    if "tags" in body:
        tags = body["tags"]
        if not isinstance(tags, list):
            tags = []
        note.tags = [str(t).strip() for t in tags if str(t).strip()]
    note.updated_at = _now()

    await db.commit()
    await db.refresh(note)
    return _note_to_dict(note)


async def delete_note(db: AsyncSession, note_id: int):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise KeyError(note_id)

    await db.delete(note)
    await db.commit()
