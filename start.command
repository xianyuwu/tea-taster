#!/bin/bash
cd "$(dirname "$0")"

# 检查并安装依赖
if ! python3 -c "import flask" 2>/dev/null; then
  echo "正在安装依赖..."
  pip3 install -r requirements.txt
fi

echo "🍵 启动岩茶品鉴系统..."
python3 server.py
