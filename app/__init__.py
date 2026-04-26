from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import DATA_DIR, PHOTO_DIR, BACKUP_DIR, BASE_DIR
from app.db import init_db
from app.utils.errors import AppError, app_error_handler
from app.utils.rate_limit import limiter
from app.routers import auth, teas, notes, config_routes, dimensions, ai, backup

# 前端构建产物目录（React 构建后）
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"


async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"error": "请求过于频繁，请稍后再试"})


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="岩茶品鉴评分系统",
        docs_url="/docs",
        redoc_url=None,
        lifespan=lifespan,
    )

    # 全局异常处理
    application.add_exception_handler(AppError, app_error_handler)
    application.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

    # 速率限制
    application.state.limiter = limiter
    application.add_middleware(SlowAPIMiddleware)

    # 安全响应头
    application.add_middleware(SecurityHeadersMiddleware)

    # 注册 API 路由
    application.include_router(auth.router)
    application.include_router(teas.router)
    application.include_router(notes.router)
    application.include_router(config_routes.router)
    application.include_router(dimensions.router)
    application.include_router(ai.router)
    application.include_router(backup.router)

    # 确保数据目录存在
    DATA_DIR.mkdir(exist_ok=True)
    PHOTO_DIR.mkdir(exist_ok=True)
    BACKUP_DIR.mkdir(exist_ok=True)

    # 照片静态文件服务
    application.mount("/data/photos", StaticFiles(directory=str(PHOTO_DIR)), name="photos")

    # 前端静态文件服务（如果构建产物存在）
    if FRONTEND_DIST.exists():
        # SPA fallback: 非API路径返回 index.html
        @application.get("/{path:path}")
        async def serve_frontend(path: str):
            file_path = FRONTEND_DIST / path
            if file_path.exists() and file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(FRONTEND_DIST / "index.html")
    else:
        # 开发模式：直接服务原始 HTML 文件
        @application.get("/")
        async def serve_index():
            return FileResponse(BASE_DIR / "index.html")

        @application.get("/admin")
        async def serve_admin():
            return FileResponse(BASE_DIR / "admin.html")

    return application
