import json
import shutil
import zipfile
from datetime import datetime
from io import BytesIO
from pathlib import Path

from sqlalchemy import delete as sql_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import BACKUP_DIR, PHOTO_DIR
from app.models import Tea, Report, Note, ConfigItem
from app.services import tea_service, note_service, config_service


def _ensure_dirs():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)


async def create_backup(db: AsyncSession) -> dict:
    _ensure_dirs()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_name = f"backup_{ts}.zip"
    zip_path = BACKUP_DIR / zip_name

    teas = await tea_service.get_all_teas(db)
    report = await tea_service.get_report(db)
    notes = await note_service.get_all_notes(db)
    config = await config_service.load_config(db)

    teas_data = {
        "nextId": max((t["id"] for t in teas), default=0),
        "teas": teas,
        "report": report,
    }
    notes_data = {
        "nextId": max((n["id"] for n in notes), default=0),
        "notes": notes,
    }

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("teas.json", json.dumps(teas_data, ensure_ascii=False, indent=2))
        zf.writestr("config.json", json.dumps(config, ensure_ascii=False, indent=2))
        zf.writestr("notes.json", json.dumps(notes_data, ensure_ascii=False, indent=2))
        if PHOTO_DIR.exists():
            for photo in PHOTO_DIR.iterdir():
                if photo.is_file():
                    zf.write(photo, f"photos/{photo.name}")
    buf.seek(0)

    with open(zip_path, "wb") as f:
        f.write(buf.getvalue())

    return {"filename": zip_name, "message": "备份创建成功"}


def list_backups() -> list[dict]:
    if not BACKUP_DIR.exists():
        return []
    files = sorted(BACKUP_DIR.glob("backup_*.zip"), reverse=True)
    return [{
        "filename": f.name,
        "size": f.stat().st_size,
        "time": datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
    } for f in files]


def get_backup_path(filename: str) -> Path | None:
    from app.utils.validation import validate_filename
    if not validate_filename(filename):
        return None
    path = BACKUP_DIR / filename
    return path if path.exists() else None


def delete_backup_file(filename: str) -> bool:
    path = get_backup_path(filename)
    if not path:
        return False
    path.unlink()
    return True


async def restore_backup(db: AsyncSession, file_bytes: bytes) -> dict:
    _ensure_dirs()

    # Auto-backup before restore
    try:
        await create_backup(db)
    except Exception:
        pass

    buf = BytesIO(file_bytes)
    try:
        with zipfile.ZipFile(buf, "r") as zf:
            names = zf.namelist()
            if "teas.json" not in names:
                raise ValueError("无效的备份文件：缺少 teas.json")

            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Clear existing data
            await db.execute(sql_delete(Tea))
            await db.execute(sql_delete(Report))
            await db.execute(sql_delete(Note))
            await db.execute(sql_delete(ConfigItem))

            # Import teas
            with zf.open("teas.json") as tf:
                teas_data = json.load(tf)
            for t in teas_data.get("teas", []):
                core_keys = {"id", "name", "scores", "note", "photo"}
                extra = {k: v for k, v in t.items() if k not in core_keys}
                tea = Tea(
                    id=t["id"],
                    name=t["name"],
                    scores=t.get("scores", {}),
                    note=t.get("note", ""),
                    photo=t.get("photo", ""),
                    extra_fields=extra,
                    created_at=now,
                    updated_at=now,
                )
                db.add(tea)

            # Import report
            report = teas_data.get("report")
            if report:
                db.add(Report(
                    id=1,
                    content=report.get("content", ""),
                    created_at=report.get("created_at", now),
                    stale=report.get("stale", False),
                ))

            # Import config
            if "config.json" in names:
                with zf.open("config.json") as cf:
                    cfg = json.load(cf)
                for key, value in cfg.items():
                    if key in config_service._JSON_KEYS or isinstance(value, (dict, list)):
                        value_str = json.dumps(value, ensure_ascii=False)
                    else:
                        value_str = str(value) if value is not None else ""
                    db.add(ConfigItem(key=key, value=value_str))

            # Import notes
            if "notes.json" in names:
                with zf.open("notes.json") as nf:
                    notes_data = json.load(nf)
                for n in notes_data.get("notes", []):
                    note = Note(
                        id=n["id"],
                        title=n.get("title", ""),
                        content=n["content"],
                        source=n.get("source", "manual"),
                        tags=n.get("tags", []),
                        created_at=n.get("created_at", now),
                        updated_at=n.get("updated_at", now),
                    )
                    db.add(note)

            # Restore photos
            if PHOTO_DIR.exists():
                shutil.rmtree(PHOTO_DIR)
            PHOTO_DIR.mkdir(exist_ok=True)
            for name in names:
                if name.startswith("photos/") and not name.endswith("/"):
                    with zf.open(name) as src:
                        dest = PHOTO_DIR / Path(name).name
                        with open(dest, "wb") as dst:
                            dst.write(src.read())

            await db.commit()

    except zipfile.BadZipFile:
        raise ValueError("文件格式错误，非有效 zip 文件")

    return {"message": "数据恢复成功"}


async def clear_all_data(db: AsyncSession) -> dict:
    await db.execute(sql_delete(Tea))
    await db.execute(sql_delete(Report))
    await db.execute(sql_delete(Note))
    await db.commit()

    if PHOTO_DIR.exists():
        shutil.rmtree(PHOTO_DIR)
    PHOTO_DIR.mkdir(exist_ok=True)

    return {"message": "数据已清空"}
