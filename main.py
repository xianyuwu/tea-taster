#!/usr/bin/env python3
"""岩茶品鉴评分系统 - FastAPI 后端服务"""

import webbrowser
from threading import Timer

import uvicorn

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = 5001
    url = f"http://localhost:{port}"
    print(f"岩茶品鉴系统已启动: {url}")
    print(f"   管理后台: {url}/admin")
    print(f"   API 文档: {url}/docs")
    Timer(1.0, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host="0.0.0.0", port=port)
