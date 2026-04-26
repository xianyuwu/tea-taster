from pydantic import BaseModel, Field
from typing import Optional


class TeaCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    # 动态字段不预定义，通过 model_config 允许额外字段
    model_config = {"extra": "allow"}


class TeaUpdate(BaseModel):
    name: Optional[str] = None
    scores: Optional[dict[str, int]] = None
    note: Optional[str] = None
    model_config = {"extra": "allow"}


class TeaResponse(BaseModel):
    id: int
    name: str
    scores: dict[str, int] = {}
    note: str = ""
    photo: str = ""
    model_config = {"extra": "allow", "from_attributes": True}
