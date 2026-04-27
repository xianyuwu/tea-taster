import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.config import ChatRequest
from app.utils.auth import get_current_user
from app.utils.rate_limit import limiter
from app.db import get_db, async_session_maker
from app.services import ai_service, tea_service
from app.utils.errors import AppError

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/api/ai/analyze")
@limiter.limit("10/minute")
async def ai_analyze(request: Request, db: AsyncSession = Depends(get_db)):
    api_key, model, base_url = await ai_service.get_ai_config(db)
    if not api_key:
        raise AppError("未配置 API Key，请通过环境变量、.env 文件或管理页面配置")

    tea_info, max_total, scored_count = await ai_service.build_tea_info(db)
    if scored_count == 0:
        raise AppError("还没有打分数据，请先评分")

    system_prompt = await ai_service.get_system_prompt(db)
    user_prompt = f"以下是我品鉴的岩茶评分数据（每项满分5分，总分满分{max_total}分）：\n\n{tea_info}"

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=base_url)

        full_text_holder = [""]

        async def save_report_bg():
            async with async_session_maker() as session:
                await tea_service.save_report(session, full_text_holder[0])

        def generate():
            stream = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    full_text_holder[0] += delta.content
                    yield f"data: {json.dumps({'content': delta.content}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            background=BackgroundTask(save_report_bg),
        )
    except Exception as e:
        raise AppError(f"AI 分析失败：{str(e)}")


@router.post("/api/ai/chat")
@limiter.limit("10/minute")
async def ai_chat(request: Request, body: ChatRequest, db: AsyncSession = Depends(get_db)):
    messages = body.messages
    if not messages:
        raise AppError("消息不能为空")

    api_key, model, base_url = await ai_service.get_ai_config(db)
    if not api_key:
        raise AppError("未配置 API Key")

    system_prompt = await ai_service.get_system_prompt(db)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=base_url)

        def generate():
            stream = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    *messages,
                ],
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield f"data: {json.dumps({'content': delta.content}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as e:
        raise AppError(f"AI 对话失败：{str(e)}")
