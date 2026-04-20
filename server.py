#!/usr/bin/env python3
"""岩茶品鉴评分系统 - Flask 后端服务"""

import json
import os
import shutil
import time
import webbrowser
import zipfile
from datetime import datetime
from io import BytesIO
from threading import Timer
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory, send_file, abort, Response, stream_with_context

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
PHOTO_DIR = DATA_DIR / "photos"
BACKUP_DIR = DATA_DIR / "backups"
TEAS_FILE = DATA_DIR / "teas.json"
CONFIG_FILE = DATA_DIR / "config.json"

app = Flask(__name__)

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

# ── 数据读写 ──────────────────────────────────────────────

def load_data():
    if TEAS_FILE.exists():
        with open(TEAS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"nextId": 0, "teas": [], "report": None}


def save_data(data):
    with open(TEAS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def find_tea(data, tea_id):
    for tea in data["teas"]:
        if tea["id"] == tea_id:
            return tea
    return None


def mark_report_stale(data):
    """标记报告为过期"""
    if data.get("report"):
        data["report"]["stale"] = True


def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"openai_api_key": "", "openai_model": "gpt-4o", "openai_base_url": "https://api.openai.com/v1"}


def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def get_api_key():
    """优先环境变量，其次 .env 文件，最后 config.json（兼容旧配置）"""
    key = os.environ.get("OPENAI_API_KEY", "")
    if key:
        return key
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return load_config().get("openai_api_key", "")


def mask_key(key):
    if not key or len(key) < 8:
        return "***"
    return key[:3] + "*" * (len(key) - 7) + key[-4:]


def get_dimensions():
    cfg = load_config()
    return cfg.get("dimensions") or DEFAULT_DIMENSIONS


# ── 静态文件 ──────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/admin")
def admin():
    return send_from_directory(BASE_DIR, "admin.html")


@app.route("/data/photos/<path:filename>")
def serve_photo(filename):
    return send_from_directory(PHOTO_DIR, filename)


# ── 茶样 API ─────────────────────────────────────────────

@app.route("/api/teas", methods=["GET"])
def get_teas():
    return jsonify(load_data()["teas"])


@app.route("/api/teas", methods=["POST"])
def add_tea():
    body = request.get_json()
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "缺少茶名"}), 400

    data = load_data()
    if any(t["name"] == name for t in data["teas"]):
        return jsonify({"error": "已有同名茶样"}), 409

    data["nextId"] += 1
    tea = {
        "id": data["nextId"],
        "name": name,
        "scores": {d["key"]: 0 for d in get_dimensions()},
        "note": "",
        "photo": "",
    }
    data["teas"].append(tea)
    mark_report_stale(data)
    save_data(data)
    return jsonify(tea), 201


@app.route("/api/teas/<int:tea_id>", methods=["PUT"])
def update_tea(tea_id):
    body = request.get_json()
    data = load_data()
    tea = find_tea(data, tea_id)
    if not tea:
        abort(404)

    if "scores" in body:
        tea["scores"].update(body["scores"])
        mark_report_stale(data)
    if "note" in body:
        tea["note"] = body["note"]

    save_data(data)
    return jsonify(tea)


@app.route("/api/teas/<int:tea_id>", methods=["DELETE"])
def delete_tea(tea_id):
    data = load_data()
    tea = find_tea(data, tea_id)
    if not tea:
        abort(404)

    if tea["photo"]:
        photo_path = PHOTO_DIR / tea["photo"]
        if photo_path.exists():
            photo_path.unlink()

    data["teas"] = [t for t in data["teas"] if t["id"] != tea_id]
    mark_report_stale(data)
    save_data(data)
    return "", 204


@app.route("/api/teas/<int:tea_id>/photo", methods=["POST"])
def upload_photo(tea_id):
    data = load_data()
    tea = find_tea(data, tea_id)
    if not tea:
        abort(404)

    file = request.files.get("photo")
    if not file:
        return jsonify({"error": "缺少图片文件"}), 400

    if tea["photo"]:
        old_path = PHOTO_DIR / tea["photo"]
        if old_path.exists():
            old_path.unlink()

    ext = Path(file.filename).suffix.lower() or ".jpg"
    filename = f"{tea_id}_{int(time.time())}{ext}"
    file.save(PHOTO_DIR / filename)

    tea["photo"] = filename
    save_data(data)
    return jsonify({"photo": filename, "url": f"/data/photos/{filename}"})


# ── 评分维度 API ──────────────────────────────────────────

@app.route("/api/dimensions", methods=["GET"])
def get_dims():
    return jsonify(get_dimensions())


@app.route("/api/dimensions", methods=["PUT"])
def update_dims():
    body = request.get_json()
    dims = body.get("dimensions")
    if not isinstance(dims, list) or not dims:
        return jsonify({"error": "维度列表不能为空"}), 400
    for d in dims:
        if not d.get("key") or not d.get("name"):
            return jsonify({"error": "每个维度必须有 key 和 name"}), 400
    cfg = load_config()
    cfg["dimensions"] = dims
    save_config(cfg)
    return jsonify({"message": "评分维度已保存"})


# ── 配置 API ─────────────────────────────────────────────

@app.route("/api/config", methods=["GET"])
def get_config():
    cfg = load_config()
    api_key = get_api_key()
    # 判断 key 来源
    env_key = os.environ.get("OPENAI_API_KEY", "")
    env_file = BASE_DIR / ".env"
    if env_key:
        key_source = "环境变量"
    elif env_file.exists() and any(l.strip().startswith("OPENAI_API_KEY=") for l in env_file.read_text().splitlines()):
        key_source = ".env 文件"
    elif cfg.get("openai_api_key"):
        key_source = "config.json（建议迁移到 .env）"
    else:
        key_source = ""
    return jsonify({
        "openai_api_key_masked": mask_key(api_key),
        "openai_key_source": key_source,
        "openai_model": cfg.get("openai_model", "gpt-4o"),
        "openai_base_url": cfg.get("openai_base_url", "https://api.openai.com/v1"),
        "system_prompt": cfg.get("system_prompt", ""),
    })


@app.route("/api/config", methods=["PUT"])
def update_config():
    body = request.get_json()
    cfg = load_config()

    # API Key 写入 .env 文件并更新内存环境变量，立即生效
    if "openai_api_key" in body and body["openai_api_key"]:
        env_file = BASE_DIR / ".env"
        lines = []
        if env_file.exists():
            lines = [l for l in env_file.read_text().splitlines() if not l.strip().startswith("OPENAI_API_KEY=")]
        lines.append(f"OPENAI_API_KEY={body['openai_api_key']}")
        env_file.write_text("\n".join(lines) + "\n")
        # 立即更新内存中的环境变量，无需重启即可生效
        os.environ["OPENAI_API_KEY"] = body["openai_api_key"]
        # 清除 config.json 中的旧 key
        cfg.pop("openai_api_key", None)

    if "openai_model" in body:
        cfg["openai_model"] = body["openai_model"]
    if "openai_base_url" in body:
        cfg["openai_base_url"] = body["openai_base_url"]
    if "system_prompt" in body:
        cfg["system_prompt"] = body["system_prompt"]

    save_config(cfg)
    return jsonify({"message": "配置已保存"})


@app.route("/api/config/test", methods=["POST"])
def test_config():
    body = request.get_json() or {}
    cfg = load_config()

    # 优先用请求体传入的值（表单当前值），否则用已保存的配置
    api_key = body.get("openai_api_key") or get_api_key()
    base_url = body.get("openai_base_url") or cfg.get("openai_base_url", "https://api.openai.com/v1")
    model = body.get("openai_model") or cfg.get("openai_model", "gpt-4o")

    if not api_key:
        return jsonify({"ok": False, "error": "未配置 API Key"}), 400

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=base_url)
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "hi"}],
        )
        return jsonify({"ok": True, "message": f"连接成功，模型: {model}"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


# ── 备份恢复 API ──────────────────────────────────────────

@app.route("/api/backup", methods=["POST"])
def create_backup():
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_name = f"backup_{ts}.zip"
    zip_path = BACKUP_DIR / zip_name

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        if TEAS_FILE.exists():
            zf.write(TEAS_FILE, "teas.json")
        if CONFIG_FILE.exists():
            zf.write(CONFIG_FILE, "config.json")
        if PHOTO_DIR.exists():
            for photo in PHOTO_DIR.iterdir():
                if photo.is_file():
                    zf.write(photo, f"photos/{photo.name}")
    buf.seek(0)

    with open(zip_path, "wb") as f:
        f.write(buf.getvalue())

    return jsonify({"filename": zip_name, "message": "备份创建成功"})


@app.route("/api/backups", methods=["GET"])
def list_backups():
    if not BACKUP_DIR.exists():
        return jsonify([])
    files = sorted(BACKUP_DIR.glob("backup_*.zip"), reverse=True)
    return jsonify([{
        "filename": f.name,
        "size": f.stat().st_size,
        "time": datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
    } for f in files])


@app.route("/api/backups/<filename>", methods=["GET"])
def download_backup(filename):
    path = BACKUP_DIR / filename
    if not path.exists():
        abort(404)
    return send_file(path, as_attachment=True)


@app.route("/api/backups/<filename>", methods=["DELETE"])
def delete_backup(filename):
    path = BACKUP_DIR / filename
    if not path.exists():
        abort(404)
    path.unlink()
    return "", 204


@app.route("/api/restore", methods=["POST"])
def restore_backup():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "缺少备份文件"}), 400

    # 恢复前自动备份当前数据
    if TEAS_FILE.exists():
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        auto_zip = BACKUP_DIR / f"backup_auto_{ts}.zip"
        with zipfile.ZipFile(auto_zip, "w", zipfile.ZIP_DEFLATED) as azf:
            azf.write(TEAS_FILE, "teas.json")
            if CONFIG_FILE.exists():
                azf.write(CONFIG_FILE, "config.json")
            if PHOTO_DIR.exists():
                for p in PHOTO_DIR.iterdir():
                    if p.is_file():
                        azf.write(p, f"photos/{p.name}")

    buf = BytesIO(file.read())
    try:
        with zipfile.ZipFile(buf, "r") as zf:
            names = zf.namelist()
            if "teas.json" not in names:
                return jsonify({"error": "无效的备份文件：缺少 teas.json"}), 400

            # 恢复 teas.json
            with zf.open("teas.json") as tf:
                data = json.load(tf)
            save_data(data)

            # 恢复 config.json
            if "config.json" in names:
                with zf.open("config.json") as cf:
                    cfg = json.load(cf)
                save_config(cfg)

            # 清空并恢复 photos
            if PHOTO_DIR.exists():
                shutil.rmtree(PHOTO_DIR)
            PHOTO_DIR.mkdir(exist_ok=True)

            for name in names:
                if name.startswith("photos/") and not name.endswith("/"):
                    with zf.open(name) as src:
                        dest = PHOTO_DIR / Path(name).name
                        with open(dest, "wb") as dst:
                            dst.write(src.read())

    except zipfile.BadZipFile:
        return jsonify({"error": "文件格式错误，非有效 zip 文件"}), 400

    return jsonify({"message": "数据恢复成功"})


@app.route("/api/data", methods=["DELETE"])
def clear_data():
    save_data({"nextId": 0, "teas": [], "report": None})
    if PHOTO_DIR.exists():
        shutil.rmtree(PHOTO_DIR)
    PHOTO_DIR.mkdir(exist_ok=True)
    return jsonify({"message": "数据已清空"})


# ── 报告 API ──────────────────────────────────────────────

@app.route("/api/report", methods=["GET"])
def get_report():
    data = load_data()
    return jsonify(data.get("report"))


@app.route("/api/report", methods=["DELETE"])
def delete_report():
    data = load_data()
    data["report"] = None
    save_data(data)
    return "", 204


# ── AI 分析 API ───────────────────────────────────────────

@app.route("/api/ai/analyze", methods=["POST"])
def ai_analyze():
    cfg = load_config()
    api_key = get_api_key()
    if not api_key:
        return jsonify({"error": "未配置 API Key，请通过环境变量、.env 文件或管理页面配置"}), 400

    data = load_data()
    if not data["teas"]:
        return jsonify({"error": "还没有茶样数据"}), 400

    scored_teas = [t for t in data["teas"] if any(v > 0 for v in t["scores"].values())]
    if not scored_teas:
        return jsonify({"error": "还没有打分数据，请先评分"}), 400

    dims = get_dimensions()
    dim_names = {d["key"]: d["name"] for d in dims}
    max_total = len(dims) * 5

    tea_info = ""
    for t in scored_teas:
        scores_str = "、".join(f"{dim_names.get(k, k)}={v}/5" for k, v in t["scores"].items() if k in dim_names)
        total = sum(v for k, v in t["scores"].items() if k in dim_names)
        tea_info += f"- {t['name']}：{scores_str}，总分={total}/{max_total}"
        if t["note"]:
            tea_info += f"，备注：{t['note']}"
        tea_info += "\n"

    system_prompt = cfg.get("system_prompt", "").strip() or DEFAULT_SYSTEM_PROMPT

    user_prompt = f"以下是我品鉴的岩茶评分数据（每项满分5分，总分满分{max_total}分）：\n\n{tea_info}"

    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=api_key,
            base_url=cfg.get("openai_base_url", "https://api.openai.com/v1"),
        )

        # 收集完整文本用于持久化
        full_text_holder = [""]

        def generate():
            stream = client.chat.completions.create(
                model=cfg.get("openai_model", "gpt-4o"),
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

            # 流式完成后保存报告
            data = load_data()
            data["report"] = {
                "content": full_text_holder[0],
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "stale": False,
            }
            save_data(data)

        return Response(stream_with_context(generate()), mimetype="text/event-stream")
    except Exception as e:
        return jsonify({"error": f"AI 分析失败：{str(e)}"}), 500


@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    """AI 追问对话接口，接收完整消息历史"""
    body = request.get_json()
    messages = body.get("messages", [])

    if not messages:
        return jsonify({"error": "消息不能为空"}), 400

    api_key = get_api_key()
    if not api_key:
        return jsonify({"error": "未配置 API Key"}), 400

    cfg = load_config()

    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=api_key,
            base_url=cfg.get("openai_base_url", "https://api.openai.com/v1"),
        )

        def generate():
            stream = client.chat.completions.create(
                model=cfg.get("openai_model", "gpt-4o"),
                messages=messages,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield f"data: {json.dumps({'content': delta.content}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        return Response(stream_with_context(generate()), mimetype="text/event-stream")
    except Exception as e:
        return jsonify({"error": f"AI 对话失败：{str(e)}"}), 500


# ── 启动 ──────────────────────────────────────────────────

if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    PHOTO_DIR.mkdir(exist_ok=True)
    BACKUP_DIR.mkdir(exist_ok=True)

    port = 5001
    url = f"http://localhost:{port}"
    print(f"🍵 岩茶品鉴系统已启动: {url}")
    print(f"   管理后台: {url}/admin")
    Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(host="0.0.0.0", port=port, debug=False)
