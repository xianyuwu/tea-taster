from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    message_id: str = Field(..., max_length=36)
    feedback: str = Field(..., pattern="^(up|down)$")
    message_content: str | None = None


class FeedbackResponse(BaseModel):
    id: int
    message_id: str
    feedback: str
    model_config = {"from_attributes": True}
