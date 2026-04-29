import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.config import ChatRequest
from app.schemas.feedback import FeedbackCreate
from app.utils.auth import get_current_user
from app.utils.rate_limit import limiter
from app.db import get_db, async_session_maker
from app.services import ai_service, tea_service, feedback_service
from app.utils.errors import AppError

RECOMMEND_PROMPT = """你是一位资深武夷岩茶品鉴师。根据以下评分数据，为排名第一的茶写一段购买推荐理由。
要求：4-5 句话，包含以下内容：
1. 这款茶的核心风味特征（结合评分高的维度）
2. 适合的消费场景（送礼、自饮、收藏等）
3. 与其他茶相比的独特优势
4. 一句总结推荐语
只输出推荐理由文字，不要加标题、不要加引号、不要加多余格式。

评分数据：
{tea_info}

推荐茶：{top_tea}，总分 {top_score}/{max_score}"""


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


@router.post("/api/ai/feedback")
async def submit_feedback(
    body: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await feedback_service.save_feedback(db, user.id, body.model_dump())
    return {"data": result}


@router.get("/api/ai/feedback")
async def get_feedback(
    message_ids: str = "",
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    ids = [m.strip() for m in message_ids.split(",") if m.strip()]
    result = await feedback_service.get_feedback_batch(db, user.id, ids)
    return {"data": result}


@router.post("/api/ai/recommend")
@limiter.limit("10/minute")
async def ai_recommend(request: Request, db: AsyncSession = Depends(get_db)):
    api_key, model, base_url = await ai_service.get_ai_config(db)
    if not api_key:
        raise AppError("未配置 API Key")

    tea_info, max_total, scored_count = await ai_service.build_tea_info(db)
    if scored_count == 0:
        raise AppError("还没有打分数据，请先评分")

    # 从 tea_info 中找出最高分茶名和分数
    lines = [l for l in tea_info.strip().split("\n") if l.strip()]
    top_line = lines[0]  # build_tea_info 按默认顺序返回，前端排名逻辑在别处
    # 解析第一行拿茶名和总分
    top_tea = top_line.split("：")[0].lstrip("- ").strip()
    score_part = [p for p in top_line.split("，") if "总分" in p]
    top_score = score_part[0].split("=")[1].split("/")[0].strip() if score_part else "0"

    # 按总分排序找真正的第一名
    tea_scores = []
    for line in lines:
        name = line.split("：")[0].lstrip("- ").strip()
        sp = [p for p in line.split("，") if "总分" in p]
        total = int(sp[0].split("=")[1].split("/")[0].strip()) if sp else 0
        tea_scores.append((name, total))
    tea_scores.sort(key=lambda x: x[1], reverse=True)
    top_tea, top_score = tea_scores[0]

    prompt = RECOMMEND_PROMPT.format(
        tea_info=tea_info,
        top_tea=top_tea,
        top_score=top_score,
        max_score=max_total,
    )

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=base_url)

        full_text_holder = [""]

        async def save_bg():
            async with async_session_maker() as session:
                await tea_service.save_recommend(session, full_text_holder[0])

        def generate():
            stream = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
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
            background=BackgroundTask(save_bg),
        )
    except Exception as e:
        raise AppError(f"推荐生成失败：{str(e)}")
