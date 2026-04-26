from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services import backup_service
from app.utils.errors import NotFoundError, AppError

router = APIRouter()


@router.post("/api/backup")
async def create_backup(db: AsyncSession = Depends(get_db)):
    return await backup_service.create_backup(db)


@router.get("/api/backups")
async def list_backups():
    return backup_service.list_backups()


@router.get("/api/backups/{filename}")
async def download_backup(filename: str):
    path = backup_service.get_backup_path(filename)
    if not path:
        raise NotFoundError("备份文件")
    return FileResponse(path, filename=filename, media_type="application/zip")


@router.delete("/api/backups/{filename}", status_code=204)
async def delete_backup(filename: str):
    if not backup_service.delete_backup_file(filename):
        raise NotFoundError("备份文件")


@router.post("/api/restore")
async def restore_backup(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    file_bytes = await file.read()
    try:
        return await backup_service.restore_backup(db, file_bytes)
    except ValueError as e:
        raise AppError(str(e))


@router.delete("/api/data")
async def clear_data(db: AsyncSession = Depends(get_db)):
    return await backup_service.clear_all_data(db)
