from app.config import DEFAULT_SYSTEM_PROMPT
from app.services import config_service, tea_service


async def build_tea_info(db) -> tuple[str, int, int]:
    teas = await tea_service.get_all_teas(db)
    dims = await config_service.get_dimensions(db)
    dim_names = {d["key"]: d["name"] for d in dims}
    max_total = len(dims) * 5
    fields = await config_service.get_tea_fields(db)

    scored_teas = [t for t in teas if any(v > 0 for v in t["scores"].values())]

    tea_info = ""
    for t in scored_teas:
        scores_str = "、".join(
            f"{dim_names.get(k, k)}={v}/5" for k, v in t["scores"].items() if k in dim_names
        )
        total = sum(v for k, v in t["scores"].items() if k in dim_names)
        tea_info += f"- {t['name']}：{scores_str}，总分={total}/{max_total}"
        if t["note"]:
            tea_info += f"，备注：{t['note']}"
        for f in fields:
            val = t.get(f["key"], "")
            if val:
                tea_info += f"，{f['label']}：{val}"
        tea_info += "\n"

    return tea_info, max_total, len(scored_teas)


async def get_ai_config(db) -> tuple[str, str, str]:
    cfg = await config_service.load_config(db)
    api_key = await config_service.get_api_key(db)
    model = cfg.get("openai_model", "gpt-4o")
    base_url = cfg.get("openai_base_url", "https://api.openai.com/v1")
    return api_key, model, base_url


async def get_system_prompt(db) -> str:
    cfg = await config_service.load_config(db)
    return (cfg.get("system_prompt", "").strip() or DEFAULT_SYSTEM_PROMPT)
