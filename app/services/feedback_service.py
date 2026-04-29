from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AiFeedback


async def save_feedback(db: AsyncSession, user_id: int, data: dict) -> dict | None:
    """保存/更新/取消反馈。同一 message_id 反馈相同则删除（取消），不同则更新。"""
    message_id = data["message_id"]
    feedback_val = data["feedback"]

    result = await db.execute(
        select(AiFeedback).where(
            AiFeedback.user_id == user_id,
            AiFeedback.message_id == message_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        if existing.feedback == feedback_val:
            # 再次点击相同反馈 → 取消
            await db.delete(existing)
            await db.commit()
            return None
        else:
            # 切换反馈方向
            existing.feedback = feedback_val
            existing.message_content = (data.get("message_content") or "")[:200]
            await db.commit()
            return {"message_id": existing.message_id, "feedback": existing.feedback}
    else:
        content = (data.get("message_content") or "")[:200]
        fb = AiFeedback(
            user_id=user_id,
            message_id=message_id,
            feedback=feedback_val,
            message_content=content,
        )
        db.add(fb)
        await db.commit()
        return {"message_id": fb.message_id, "feedback": fb.feedback}


async def get_feedback_batch(
    db: AsyncSession, user_id: int, message_ids: list[str]
) -> list[dict]:
    """批量查询用户对指定消息的反馈。"""
    if not message_ids:
        return []
    result = await db.execute(
        select(AiFeedback).where(
            AiFeedback.user_id == user_id,
            AiFeedback.message_id.in_(message_ids),
        )
    )
    return [
        {"message_id": fb.message_id, "feedback": fb.feedback}
        for fb in result.scalars().all()
    ]
