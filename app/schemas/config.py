from pydantic import BaseModel
from typing import Optional


class ConfigUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    openai_model: Optional[str] = None
    openai_base_url: Optional[str] = None
    system_prompt: Optional[str] = None


class ConfigTestRequest(BaseModel):
    openai_api_key: Optional[str] = None
    openai_model: Optional[str] = None
    openai_base_url: Optional[str] = None


class ConfigResponse(BaseModel):
    openai_api_key_masked: str = ""
    openai_key_source: str = ""
    openai_model: str = "gpt-4o"
    openai_base_url: str = "https://api.openai.com/v1"
    system_prompt: str = ""


class DimensionsUpdate(BaseModel):
    dimensions: list[dict]


class TeaFieldsUpdate(BaseModel):
    teaFields: list[dict]


class DerivedMetricsUpdate(BaseModel):
    derivedMetrics: list[dict]


class MessageResponse(BaseModel):
    message: str


class ChatRequest(BaseModel):
    messages: list[dict]
