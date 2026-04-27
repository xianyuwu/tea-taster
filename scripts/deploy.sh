#!/usr/bin/env bash
# 岩茶品鉴评分系统 - 生产部署脚本
# 处理：命名卷迁移 → 数据库备份 → schema 迁移 → 构建启动

set -euo pipefail

COMPOSE_PROJECT="${COMPOSE_PROJECT:-.}"
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ---------- 0. 前置检查 ----------
command -v docker >/dev/null 2>&1 || error "需要 docker"
docker compose version >/dev/null 2>&1 || error "需要 docker compose"

if [ ! -f .env ]; then
    warn ".env 文件不存在，从 .env.example 复制"
    cp .env.example .env
    error "请先编辑 .env 配置 SECRET_KEY 等参数后重新运行"
fi

grep -q '^SECRET_KEY=.' .env || error ".env 中必须设置 SECRET_KEY（非空字符串）"

# ---------- 1. 停旧服务 ----------
info "停止旧服务..."
docker compose down

# ---------- 2. 命名卷迁移（如果存在） ----------
VOLUME_NAME="$(docker compose config --volumes 2>/dev/null | grep 'tea-data' || true)"
NAMED_VOLUME_EXISTS=false

# 检查旧版命名卷是否存在
if docker volume inspect "${COMPOSE_PROJECT}_tea-data" >/dev/null 2>&1 \
   || docker volume inspect "tea-data" >/dev/null 2>&1; then
    NAMED_VOLUME_EXISTS=true
fi

if [ "$NAMED_VOLUME_EXISTS" = true ]; then
    # 找到实际的卷名
    if docker volume inspect "${COMPOSE_PROJECT}_tea-data" >/dev/null 2>&1; then
        VOL="${COMPOSE_PROJECT}_tea-data"
    else
        VOL="tea-data"
    fi

    info "检测到命名卷 $VOL，迁移数据到 ./data/"
    mkdir -p ./data

    # 如果 ./data 已有数据，确认是否覆盖
    if [ "$(ls -A ./data 2>/dev/null)" ]; then
        warn "./data/ 目录非空"
        read -p "是否跳过卷迁移？[Y/n] " -r
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            info "跳过卷迁移"
            VOL=""
        fi
    fi

    if [ -n "$VOL" ]; then
        info "从命名卷拷贝数据..."
        docker run --rm \
            -v "$VOL:/source:ro" \
            -v "$(pwd)/data:/target" \
            busybox sh -c "cp -a /source/. /target/"
        info "卷迁移完成"
    fi
fi

# ---------- 3. 备份数据库 ----------
DB_FILE="./data/tea-taster.db"
if [ -f "$DB_FILE" ]; then
    BACKUP="./data/tea-taster.db.pre-deploy.$(date +%Y%m%d%H%M%S)"
    info "备份数据库 → $BACKUP"
    cp "$DB_FILE" "$BACKUP"
else
    warn "数据库文件不存在 ($DB_FILE)，跳过备份"
fi

# ---------- 4. 构建新镜像 ----------
info "构建 Docker 镜像..."
docker compose build

# ---------- 5. 数据库迁移 ----------
info "执行数据库迁移..."
docker compose run --rm app alembic upgrade head

# ---------- 6. 启动服务 ----------
info "启动服务..."
docker compose up -d

# ---------- 7. 健康检查 ----------
info "等待服务启动..."
sleep 5

if docker compose ps | grep -q "running\|healthy"; then
    info "服务已启动"
    info "访问地址: http://localhost"
    info "查看日志: docker compose logs -f"
else
    error "服务启动失败，请检查: docker compose logs"
fi
