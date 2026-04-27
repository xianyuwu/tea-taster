"""change_time_fields_to_datetime

Revision ID: 7b9f70ed6608
Revises: c92c3c1f1c28
Create Date: 2026-04-27 20:11:57.265709

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b9f70ed6608'
down_revision: Union[str, None] = 'c92c3c1f1c28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES_COLS = {
    "users": ["created_at", "updated_at"],
    "teas": ["created_at", "updated_at"],
    "notes": ["created_at", "updated_at"],
    "reports": ["created_at"],
}


def _rebuild_table(table, datetime_cols):
    """手动重建表：重命名旧表 → 建新表 → 拷贝数据 → 删旧表"""
    conn = op.get_bind()

    # 获取表结构信息
    columns_info = conn.execute(sa.text(f"PRAGMA table_info([{table}])")).fetchall()
    col_names = [row[1] for row in columns_info]

    # 重命名旧表
    old_table = f"{table}_old"
    op.rename_table(table, old_table)

    # 构建新表的列定义（复用原表结构，只改时间列类型）
    col_defs = []
    for row in columns_info:
        col_name = row[1]
        col_type = "DATETIME" if col_name in datetime_cols else row[2]
        not_null = "NOT NULL" if row[3] else ""
        default_val = ""
        if row[4] is not None:
            default_val = f"DEFAULT {row[4]}"
        pk = "PRIMARY KEY AUTOINCREMENT" if row[5] else ""
        col_defs.append(f"[{col_name}] {col_type} {not_null} {default_val} {pk}".strip())

    # 获取索引和约束
    indexes = conn.execute(sa.text(f"PRAGMA index_list([{old_table}])")).fetchall()
    unique_cols = set()
    for idx in indexes:
        if idx[2]:  # unique
            idx_info = conn.execute(sa.text(f"PRAGMA index_info([{idx[1]}])")).fetchall()
            for info in idx_info:
                unique_cols.add(info[2])

    # 构建 CREATE TABLE 语句
    col_defs_str = ", ".join(col_defs)
    unique_clause = ""
    if unique_cols:
        unique_clause = f", UNIQUE({', '.join(f'[{c}]' for c in unique_cols)})"
    create_sql = f"CREATE TABLE [{table}] ({col_defs_str}{unique_clause})"
    conn.execute(sa.text(create_sql))

    # 拷贝数据，将 'YYYY-MM-DD HH:MM:SS' 转为 'YYYY-MM-DDTHH:MM:SS'
    select_exprs = []
    for col_name in col_names:
        if col_name in datetime_cols:
            select_exprs.append(
                f"CASE WHEN [{col_name}] LIKE '____-__-__ __:__:__' "
                f"THEN REPLACE([{col_name}], ' ', 'T') "
                f"ELSE [{col_name}] END"
            )
        else:
            select_exprs.append(f"[{col_name}]")

    insert_sql = (
        f"INSERT INTO [{table}] ({', '.join(f'[{c}]' for c in col_names)}) "
        f"SELECT {', '.join(select_exprs)} FROM [{old_table}]"
    )
    conn.execute(sa.text(insert_sql))

    # 删除旧表
    conn.execute(sa.text(f"DROP TABLE [{old_table}]"))


def upgrade() -> None:
    for table, cols in _TABLES_COLS.items():
        _rebuild_table(table, cols)


def downgrade() -> None:
    # 回滚：将 DateTime 列改回 String(30)
    for table, cols in _TABLES_COLS.items():
        old_table = f"{table}_old"

        conn = op.get_bind()
        columns_info = conn.execute(sa.text(f"PRAGMA table_info([{table}])")).fetchall()
        col_names = [row[1] for row in columns_info]

        op.rename_table(table, old_table)

        col_defs = []
        for row in columns_info:
            col_name = row[1]
            col_type = "VARCHAR(30)" if col_name in cols else row[2]
            not_null = "NOT NULL" if row[3] else ""
            default_val = ""
            if row[4] is not None:
                default_val = f"DEFAULT {row[4]}"
            pk = "PRIMARY KEY AUTOINCREMENT" if row[5] else ""
            col_defs.append(f"[{col_name}] {col_type} {not_null} {default_val} {pk}".strip())

        indexes = conn.execute(sa.text(f"PRAGMA index_list([{old_table}])")).fetchall()
        unique_cols = set()
        for idx in indexes:
            if idx[2]:
                idx_info = conn.execute(sa.text(f"PRAGMA index_info([{idx[1]}])")).fetchall()
                for info in idx_info:
                    unique_cols.add(info[2])

        col_defs_str = ", ".join(col_defs)
        unique_clause = ""
        if unique_cols:
            unique_clause = f", UNIQUE({', '.join(f'[{c}]' for c in unique_cols)})"
        conn.execute(sa.text(f"CREATE TABLE [{table}] ({col_defs_str}{unique_clause})"))

        select_exprs = []
        for col_name in col_names:
            if col_name in cols:
                select_exprs.append(f"REPLACE([{col_name}], 'T', ' ')")
            else:
                select_exprs.append(f"[{col_name}]")

        conn.execute(sa.text(
            f"INSERT INTO [{table}] ({', '.join(f'[{c}]' for c in col_names)}) "
            f"SELECT {', '.join(select_exprs)} FROM [{old_table}]"
        ))
        conn.execute(sa.text(f"DROP TABLE [{old_table}]"))
