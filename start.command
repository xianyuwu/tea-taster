#!/bin/bash
cd "$(dirname "$0")"

VENV_DIR=".venv"

# ── 1. 确保 Python3 可用 ──────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌ 未找到 python3，请先安装 Python 3"
  echo "   推荐方式: brew install python3"
  read -p "按回车键退出..."
  exit 1
fi

# ── 2. 创建虚拟环境（首次运行） ──────────────────────
if [ ! -d "$VENV_DIR" ]; then
  echo "🔧 首次运行，正在创建虚拟环境..."
  python3 -m venv "$VENV_DIR"
  if [ $? -ne 0 ]; then
    echo "❌ 创建虚拟环境失败，请检查 Python 安装"
    read -p "按回车键退出..."
    exit 1
  fi
  echo "✅ 虚拟环境创建完成"
fi

# ── 3. 激活虚拟环境 ──────────────────────────────────
source "$VENV_DIR/bin/activate"

# ── 4. 检查并安装依赖 ────────────────────────────────
if ! python -c "import flask" 2>/dev/null; then
  echo "📦 正在安装依赖..."
  pip install -r requirements.txt
  if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败，请检查网络连接"
    read -p "按回车键退出..."
    exit 1
  fi
  echo "✅ 依赖安装完成"
fi

# ── 5. 启动服务 ──────────────────────────────────────
echo ""
echo "🍵 启动岩茶品鉴系统..."
echo "   访问地址: http://localhost:5001"
echo "   管理后台: http://localhost:5001/admin"
echo "   按 Ctrl+C 停止服务"
echo ""
python server.py

# ── 6. 退出后保持终端（方便看报错信息） ──────────────
echo ""
echo "服务已停止。"
read -p "按回车键退出..."
