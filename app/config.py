from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
PHOTO_DIR = DATA_DIR / "photos"
BACKUP_DIR = DATA_DIR / "backups"
TEAS_FILE = DATA_DIR / "teas.json"
CONFIG_FILE = DATA_DIR / "config.json"
NOTES_FILE = DATA_DIR / "notes.json"

DEFAULT_SYSTEM_PROMPT = """你是一位资深的武夷岩茶品鉴师，拥有丰富的岩茶评审和品饮经验。
请根据用户提供的岩茶评分数据，给出专业的品鉴分析。

请从以下四个方面进行分析，用 Markdown 格式输出：

## 逐款点评
对每款茶进行简要点评，突出其特点和风格。

## 横向对比
分析各款茶之间的差异，指出各自的优势和不足。

## 选购建议
根据评分数据分析用户的口味偏好，给出选购推荐。

## 冲泡建议
针对评分较低的维度，分析可能的原因（茶叶本身 or 冲泡方式），给出改善建议。

语言风格：专业但亲切，避免过于学术化。"""

DEFAULT_DIMENSIONS = [
    {"key": "aroma", "name": "香气", "desc": "闻起来是否好闻、浓郁、有层次"},
    {"key": "color", "name": "汤色", "desc": "茶汤颜色是否透亮好看"},
    {"key": "body", "name": "醇厚度", "desc": "茶汤是否有「内容」、饱满不寡淡"},
    {"key": "smooth", "name": "顺滑度", "desc": "入口是否丝滑细腻不粗糙"},
    {"key": "sweet", "name": "回甘", "desc": "咽下后嘴里是否有甜感回上来"},
    {"key": "bitter", "name": "不苦涩", "desc": "苦涩感越少得分越高"},
    {"key": "overall", "name": "整体愉悦", "desc": "综合感受，想不想再来一杯"},
]

DEFAULT_TEA_FIELDS = [
    {"key": "variety", "label": "品种", "type": "text"},
    {"key": "grade", "label": "等级", "type": "text"},
    {"key": "origin", "label": "产地", "type": "text"},
    {"key": "producer", "label": "生产企业", "type": "text", "align": "left"},
    {"key": "price", "label": "价格", "type": "number", "unit": "元"},
    {"key": "brand", "label": "品牌", "type": "text"},
    {"key": "weight", "label": "净重", "type": "number", "unit": "g"},
]

DEFAULT_DERIVED_METRICS = [
    {"key": "unitPrice", "label": "单价", "numerator": "price",
     "denominator": "weight", "unit": "元/克", "minRequired": 2, "colorMap": True},
]


class Settings(BaseSettings):
    secret_key: str = "change-me-in-production"
    openai_api_key: str = ""
    database_url: str = ""
    storage_type: str = "local"
    s3_endpoint: str = ""
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = ""
    s3_public_url: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
