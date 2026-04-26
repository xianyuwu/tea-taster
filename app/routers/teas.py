import time
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Tea
from app.utils.errors import NotFoundError, DuplicateError, AppError
from app.utils.validation import is_allowed_image
from app.services import tea_service
from app.services.storage import get_storage

router = APIRouter()

MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5MB
MAX_PHOTO_WIDTH = 1200


@router.get("/api/teas")
async def get_teas(db: AsyncSession = Depends(get_db)):
    return await tea_service.get_all_teas(db)


@router.post("/api/teas", status_code=201)
async def add_tea(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        return await tea_service.create_tea(db, body)
    except ValueError as e:
        if "同名" in str(e):
            raise DuplicateError(str(e))
        raise AppError(str(e))


@router.put("/api/teas/{tea_id}")
async def update_tea(tea_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    try:
        return await tea_service.update_tea(db, tea_id, body)
    except KeyError:
        raise NotFoundError("茶样")


@router.delete("/api/teas/{tea_id}", status_code=204)
async def delete_tea(tea_id: int, db: AsyncSession = Depends(get_db)):
    try:
        await tea_service.delete_tea(db, tea_id)
    except KeyError:
        raise NotFoundError("茶样")


@router.post("/api/teas/{tea_id}/photo")
async def upload_photo(tea_id: int, photo: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tea).where(Tea.id == tea_id))
    tea = result.scalar_one_or_none()
    if not tea:
        raise NotFoundError("茶样")

    ext = Path(photo.filename).suffix.lower() if photo.filename else ".jpg"
    if not is_allowed_image(ext):
        raise AppError("不支持的图片格式")

    content = await photo.read()
    if len(content) > MAX_PHOTO_SIZE:
        raise AppError("图片文件过大，最大允许 5MB")

    try:
        img = Image.open(BytesIO(content))
        img.verify()
        img = Image.open(BytesIO(content))
    except Exception:
        raise AppError("无法解析图片文件")

    if img.width > MAX_PHOTO_WIDTH:
        ratio = MAX_PHOTO_WIDTH / img.width
        new_size = (MAX_PHOTO_WIDTH, int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    output = BytesIO()
    img.save(output, format="JPEG", quality=85)
    content = output.getvalue()

    storage = get_storage()
    if tea.photo:
        await storage.delete(tea.photo)

    filename = f"{tea_id}_{int(time.time())}.jpg"
    await storage.save(filename, content, content_type="image/jpeg")
    url = await storage.get_url(filename)

    tea.photo = filename
    await db.commit()

    return {"photo": filename, "url": url}


@router.get("/api/report")
async def get_report(db: AsyncSession = Depends(get_db)):
    return await tea_service.get_report(db)


@router.delete("/api/report", status_code=204)
async def delete_report(db: AsyncSession = Depends(get_db)):
    await tea_service.delete_report(db)
