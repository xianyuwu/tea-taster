from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ChangeRoleRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.utils.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    oauth2_scheme,
    require_admin,
    verify_password,
)
from app.utils.errors import AppError

from app.utils.rate_limit import limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/has-users")
async def has_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.count()).select_from(User))
    return {"has_users": result.scalar() > 0}


@router.post("/register", response_model=UserResponse)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        raise AppError("用户名已存在", 409)

    now = datetime.now(timezone.utc)
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        role="user",
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/register-first", response_model=TokenResponse)
async def register_first_user(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(func.count()).select_from(User))
    if result.scalar() > 0:
        raise AppError("已有用户注册，请使用正常注册流程", 400)

    now = datetime.now(timezone.utc)
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        role="admin",
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise AppError("用户名或密码错误", 401)

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(token)
    except Exception:
        raise AppError("无效的刷新凭证", 401)

    if payload.get("type") != "refresh":
        raise AppError("无效的刷新凭证", 401)

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise AppError("用户不存在", 401)

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.put("/password")
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.old_password, user.password_hash):
        raise AppError("原密码错误", 400)

    user.password_hash = hash_password(body.new_password)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "密码已更新"}


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def change_role(
    user_id: int,
    body: ChangeRoleRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise AppError("不能修改自己的角色", 400)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise AppError("用户不存在", 404)

    if user.role == "admin" and body.role == "user":
        count_result = await db.execute(
            select(func.count()).select_from(User).where(User.role == "admin")
        )
        if count_result.scalar() <= 1:
            raise AppError("系统必须保留至少一个管理员", 400)

    user.role = body.role
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise AppError("不能删除自己", 400)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise AppError("用户不存在", 404)

    if user.role == "admin":
        count_result = await db.execute(
            select(func.count()).select_from(User).where(User.role == "admin")
        )
        if count_result.scalar() <= 1:
            raise AppError("系统必须保留至少一个管理员", 400)

    await db.delete(user)
    await db.commit()
    return {"message": "用户已删除"}
