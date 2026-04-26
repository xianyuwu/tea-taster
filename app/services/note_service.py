from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Note


def _note_to_dict(note: Note) -> dict:
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "source": note.source,
        "tags": note.tags or [],
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    }


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


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
