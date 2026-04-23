# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

岩茶品鉴评分系统 — 武夷岩茶品鉴打分与对比工具。Flask 单文件后端 + 两个纯 HTML/CSS/JS 前端页面，无构建工具、无框架、无测试。

## Commands

```bash
# 启动开发服务（端口 5001）
source .venv/bin/activate && python server.py

# macOS 一键启动（自动创建 venv + 安装依赖）
./start.command

# 安装依赖
pip install -r requirements.txt
```

没有 lint、没有 test suite、没有 build step。

## Architecture

**后端：`server.py`** — 单文件 Flask 应用，所有 API 和静态文件服务在此。
- 数据存储：`data/` 目录下的 JSON 文件（`teas.json`、`config.json`、`notes.json`），无数据库
- 文件上传：茶样照片存 `data/photos/`
- AI 功能：通过 OpenAI 兼容 API（openai 库）调用大模型，SSE 流式输出
- API Key 优先级：环境变量 > `.env` 文件 > `config.json`

**前端：两个独立 HTML 文件，各自包含完整的 CSS + JS，主内容宽度 1200px**
- `index.html`（~3700 行）：品鉴主页面 — 顶层双 Tab（品鉴打分/品茶笔记）、添加茶样（弹窗填写扩展字段）、逐项打分（7 维度 × 1-5 分）、对比表格（含信息行 + 单价对比）、排名、AI 分析报告、浮动 AI 助手对话（支持收藏到笔记）
- `admin.html`（~660 行）：管理后台 — 大模型配置、系统提示词编辑、评分维度自定义（拖拽排序）、数据备份恢复

**设计规范：`DESIGN_SYSTEM.md`** — 茶色温润主题的完整 UI 规范（颜色、字体、间距、圆角、阴影、组件模板）。前端改动必须遵循此规范，使用 CSS 变量。

## Key Patterns

- 前端 JS 用 `fetch()` 调后端 REST API，AI 相关接口返回 SSE 流（`text/event-stream`）
- 报告持久化：AI 分析完成后自动写入 `teas.json` 的 `report` 字段，茶样变更时标记 `stale: true`
- 评分维度可自定义（存在 `config.json`），默认 7 维度定义在 `server.py` 的 `DEFAULT_DIMENSIONS`
- 备份机制：ZIP 打包 `teas.json` + `config.json` + `notes.json` + `photos/`，恢复前自动创建快照
- 品茶笔记：顶层 Tab 切换的独立视图，支持手动新增/编辑/删除，AI 对话气泡收藏按钮一键存入笔记（source 区分 manual/ai-chat）
- 弹窗显隐：`.modal-mask` 用 CSS `opacity` + `.show` class 控制，不要用 `style.display`
- 茶样扩展字段：品种、等级、产地、生产企业、价格、品牌、净重，添加/编辑时通过弹窗填写，卡片以 pill 标签展示
- 茶样编辑：复用添加弹窗，通过 `teaEditorMode`（'add'|'edit'）区分新建和编辑
- 对比表格：信息行（浅色背景）+ 分隔线 + 评分维度行，单价行根据价格自动着色（绿→红渐变）
- 图片预览：`position: fixed` 元素必须挂载到 `document.body`，不能放在 `position: sticky` 祖先内

## Data Directory

`data/` 已在 `.gitignore` 中，不入库。包含：`teas.json`（茶样+报告）、`config.json`（系统配置）、`notes.json`（品茶笔记）、`photos/`（图片）、`backups/`（备份 ZIP）。
