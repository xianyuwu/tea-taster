from pydantic import BaseModel, Field
from typing import Optional


class NoteCreate(BaseModel):
    content: str = Field(..., min_length=1)
    title: Optional[str] = ""
    source: Optional[str] = "manual"
    tags: Optional[list[str]] = Field(default_factory=list)


class NoteUpdate(BaseModel):
    content: str = Field(..., min_length=1)
    title: Optional[str] = ""
    tags: Optional[list[str]] = None


class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    source: str = "manual"
    tags: list[str] = []
    created_at: str = ""
    updated_at: str = ""
    model_config = {"from_attributes": True}
