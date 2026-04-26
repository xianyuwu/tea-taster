# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

岩茶品鉴评分系统 — 武夷岩茶品鉴打分与对比工具。FastAPI 后端 + React 前端。

## Commands

```bash
# 启动后端开发服务（端口 5001）
source .venv/bin/activate && python main.py

# 安装后端依赖
pip install -r requirements.txt

# 数据库迁移
alembic upgrade head

# 从 JSON 迁移数据到 SQLite（一次性）
python scripts/migrate_json_to_sqlite.py

# 生成新的迁移（模型变更后）
alembic revision --autogenerate -m "description"

# 启动前端开发服务（端口 3000，代理 API 到 5001）
cd frontend && npm run dev

# 构建前端
cd frontend && npm run build

# Docker 部署
docker compose up -d --build

# 运行测试
pytest
```

## Architecture

**后端：`app/` 包** — FastAPI 模块化应用，各层分离。
- `app/__init__.py` — FastAPI 工厂 `create_app()`，lifespan 管理数据库初始化，安全中间件
- `app/config.py` — 配置常量 + pydantic-settings Settings 类（含 S3 配置）
- `app/db.py` — SQLAlchemy async 引擎 + 会话管理（`get_db` 依赖注入、`init_db` 自动建表）
- `app/models.py` — SQLAlchemy ORM 模型（User、Tea、Report、Note、ConfigItem）
- `app/routers/` — 7 个 APIRouter（auth、teas、notes、config、dimensions、ai、backup）
- `app/services/` — async 业务逻辑层 + 存储抽象层（`storage.py`）
- `app/schemas/` — Pydantic 请求/响应模型（auth、tea、note、config）
- `app/utils/` — JWT 认证、错误处理、输入校验、速率限制
- `main.py` — 入口文件，启动 Uvicorn 服务
- 数据存储：SQLite（`data/tea-taster.db`），SQLAlchemy 2.0 async + Alembic 管理迁移
- 认证：JWT（PyJWT + bcrypt），access_token 30min，refresh_token 7 天
- 文件上传：茶样照片通过 `StorageBackend` 抽象层存储（本地或 S3），Pillow 自动缩放
- AI 功能：通过 OpenAI 兼容 API 调用大模型，SSE 流式输出（`StreamingResponse`）
- API Key 优先级：环境变量 > `.env` 文件 > 数据库 config 表
- 速率限制：全局 60/min，AI 10/min，登录 5/min
- API 文档：`/docs` 自动生成 OpenAPI 交互式文档

**旧后端：`server.py`** — 原始 Flask 单文件应用，保留作参考，已被 `app/` 替代。

**前端：`frontend/` React 应用**
- React 19 + Vite + Zustand + React Router
- `stores/` — 5 个 Zustand store（useAuthStore、useTeaStore、useNoteStore、useConfigStore、useChatStore）
- `api/` — API 调用层（client.js 处理 token 注入 + 401 自动刷新）
- `pages/` — 3 个页面（LoginPage、TastingPage、AdminPage）
- `components/` — 组件按领域分目录（ui、auth、tea、ai、note、admin）
- `styles/` — CSS 变量 + 全局样式，遵循 DESIGN_SYSTEM.md 茶色主题

**设计规范：`DESIGN_SYSTEM.md`** — 茶色温润主题的完整 UI 规范。前端改动必须遵循此规范。

## Key Patterns

- 后端路由用 FastAPI `APIRouter`，通过 `Depends(get_db)` 注入 `AsyncSession`，业务逻辑在 `services/` 层
- 认证：`Depends(get_current_user)` 保护所有 API（登录/注册除外），`Depends(require_admin)` 保护管理端点
- 数据库会话：每个请求一个 session（`get_db` 生成器），service 层负责 commit
- 错误处理：`AppError` / `NotFoundError` / `DuplicateError`，全局 `@app.exception_handler` 统一返回 `{"error": "message"}`
- 存储抽象：`StorageBackend` ABC → `LocalStorage` / `S3Storage`，通过 `STORAGE_TYPE` 环境变量切换
- 前端 token 管理：access_token 存 Zustand store，api/client.js 自动注入 + 401 自动刷新
- 报告持久化：AI 分析完成后自动写入 reports 表，茶样变更时标记 `stale: true`
- 茶样动态字段存储在 `extra_fields` JSON 列，API 响应时合并到顶层
- 配置存储在 config 表（key-value），复杂值 JSON 编码
- 备份机制：ZIP 打包从数据库导出的 JSON + photos/，恢复时导入到数据库

## Data Directory

`data/` 已在 `.gitignore` 中，不入库。包含：`tea-taster.db`、`photos/`、`backups/`。

## Deployment

- Docker 多阶段构建：前端 npm build + 后端 Python 运行环境
- `docker-compose.yml`：app + nginx 两个服务
- Nginx：前端静态文件服务 + `/api/` 反向代理（SSE 关闭 proxy_buffering）+ TLS 终止
- 环境变量通过 `.env` 文件配置（参考 `.env.example`）
