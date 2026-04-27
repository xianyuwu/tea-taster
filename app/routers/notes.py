from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.note import NoteCreate, NoteUpdate
from app.utils.auth import get_current_user
from app.utils.errors import NotFoundError, AppError
from app.services import note_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/api/notes")
async def get_notes(db: AsyncSession = Depends(get_db)):
    return await note_service.get_all_notes(db)


@router.post("/api/notes", status_code=201)
async def add_note(body: NoteCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await note_service.create_note(db, body.model_dump())
    except ValueError as e:
        raise AppError(str(e))


@router.put("/api/notes/{note_id}")
async def update_note(note_id: int, body: NoteUpdate, db: AsyncSession = Depends(get_db)):
    try:
        return await note_service.update_note(db, note_id, body.model_dump())
    except KeyError:
        raise NotFoundError("笔记")
    except ValueError as e:
        raise AppError(str(e))


@router.delete("/api/notes/{note_id}", status_code=204)
async def delete_note(note_id: int, db: AsyncSession = Depends(get_db)):
    try:
        await note_service.delete_note(db, note_id)
    except KeyError:
        raise NotFoundError("笔记")
