#!/usr/bin/env python3
"""一次性迁移脚本：JSON 数据文件 → SQLite 数据库"""

import json
import sys
from datetime import datetime
from pathlib import Path

import sqlalchemy as sa
import sqlalchemy.orm

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import DATA_DIR, TEAS_FILE, CONFIG_FILE, NOTES_FILE
from app.models import Base, Tea, Report, Note, ConfigItem

DB_PATH = DATA_DIR / "tea-taster.db"


def migrate():
    if DB_PATH.exists():
        print(f"数据库已存在: {DB_PATH}")
        confirm = input("是否覆盖？(y/N): ").strip().lower()
        if confirm != "y":
            print("取消迁移")
            return
        DB_PATH.unlink()

    DATA_DIR.mkdir(exist_ok=True)

    # Create tables using SQLAlchemy metadata
    engine = sa.create_engine(f"sqlite:///{DB_PATH}")
    Base.metadata.create_all(engine)

    with sa.orm.Session(engine) as session:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tea_count = 0
        note_count = 0
        config_count = 0
        has_report = False

        # Migrate teas
        if TEAS_FILE.exists():
            with open(TEAS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

            for t in data.get("teas", []):
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
                session.add(tea)
                tea_count += 1

            # Migrate report
            report = data.get("report")
            if report:
                session.add(Report(
                    id=1,
                    content=report.get("content", ""),
                    created_at=report.get("created_at", now),
                    stale=report.get("stale", False),
                ))
                has_report = True

        # Migrate config
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                config = json.load(f)

            for key, value in config.items():
                if isinstance(value, (dict, list)):
                    value_str = json.dumps(value, ensure_ascii=False)
                else:
                    value_str = str(value) if value is not None else ""
                session.add(ConfigItem(key=key, value=value_str))
                config_count += 1

        # Migrate notes
        if NOTES_FILE.exists():
            with open(NOTES_FILE, "r", encoding="utf-8") as f:
                notes_data = json.load(f)

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
                session.add(note)
                note_count += 1

        session.commit()

    print("迁移完成！")
    print(f"  茶样: {tea_count} 条")
    print(f"  笔记: {note_count} 条")
    print(f"  配置: {config_count} 项")
    print(f"  报告: {'有' if has_report else '无'}")
    print(f"\n数据库: {DB_PATH}")
    print("原 JSON 文件保留在 data/ 目录下，确认无误后可手动删除。")


if __name__ == "__main__":
    migrate()
