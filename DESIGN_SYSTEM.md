# 岩茶品鉴系统 Design System

本文档定义了岩茶品鉴评分系统的设计规范，确保后续新增功能与现有设计风格保持一致。

---

## 一、设计理念

**主题风格**：茶色温润、简约现代、专业亲和

**设计原则**：
- 温暖的茶色调，营造舒适的品鉴氛围
- 清晰的层次结构，信息一目了然
- 圆润的边角，柔和友好
- 适度的阴影，立体感但不厚重

---

## 二、颜色系统

### 2.1 主色调（茶色系）

| 名称 | 色值 | 用途 |
|------|------|------|
| `--color-primary` | `#8b5e3c` | 主按钮、Tab激活、链接、强调元素 |
| `--color-primary-dark` | `#6d4a2f` | 主按钮hover状态 |
| `--color-primary-light` | `#a06d40` | 渐变终点、次级强调 |

### 2.2 背景色

| 名称 | 色值 | 用途 |
|------|------|------|
| `--color-bg-page` | `#f5f0eb` | 页面背景 |
| `--color-bg-card` | `#fff` | 卡片、区块背景 |
| `--color-bg-secondary` | `#faf6f1` | 次级背景、表格斑马纹 |
| `--color-bg-tertiary` | `#f0e6d9` | 第三级背景、hover状态 |
| `--color-bg-muted` | `#ebe0d3` | 禁用、占位背景 |

### 2.3 边框色

| 名称 | 色值 | 用途 |
|------|------|------|
| `--color-border` | `#e8ddd0` | 主要边框 |
| `--color-border-light` | `#d4c4b0` | 输入框、次级边框 |
| `--color-border-muted` | `#c4b0a0` | 占位、禁用边框 |

### 2.4 文字色

| 名称 | 色值 | 用途 |
|------|------|------|
| `--color-text-primary` | `#3a2e2a` | 主要文字 |
| `--color-text-secondary` | `#5c3a21` | 标题、重要文字 |
| `--color-text-tertiary` | `#8a7060` | 次要文字、描述 |
| `--color-text-muted` | `#a08a78` | 辅助文字、提示 |
| `--color-text-placeholder` | `#c4b0a0` | 占位文字 |
| `--color-text-empty` | `#b0a090` | 空状态文字 |

### 2.5 功能色

| 名称 | 色值 | 用途 |
|------|------|------|
| `--color-success` | `#3a7d0a` | 成功状态 |
| `--color-success-bg` | `#f0f9eb` | 成功背景 |
| `--color-danger` | `#d4380d` | 危险、删除、最高分 |
| `--color-danger-bg` | `#fef2f0` | 危险背景 |
| `--color-warning` | `#d4a017` | 警告、提示、金色 |
| `--color-warning-bg` | `#fff9e6` | 警告背景 |

### 2.6 奖牌色

| 名称 | 色值 | 用途 |
|------|------|------|
| `--color-gold` | `#d4a017` | 第一名、推荐 |
| `--color-silver` | `#a0a0a0` | 第二名 |
| `--color-bronze` | `#b87333` | 第三名 |

### 2.7 CSS变量定义

```css
:root {
  /* 主色调 */
  --color-primary: #8b5e3c;
  --color-primary-dark: #6d4a2f;
  --color-primary-light: #a06d40;
  
  /* 背景色 */
  --color-bg-page: #f5f0eb;
  --color-bg-card: #fff;
  --color-bg-secondary: #faf6f1;
  --color-bg-tertiary: #f0e6d9;
  --color-bg-muted: #ebe0d3;
  
  /* 边框色 */
  --color-border: #e8ddd0;
  --color-border-light: #d4c4b0;
  --color-border-muted: #c4b0a0;
  
  /* 文字色 */
  --color-text-primary: #3a2e2a;
  --color-text-secondary: #5c3a21;
  --color-text-tertiary: #8a7060;
  --color-text-muted: #a08a78;
  --color-text-placeholder: #c4b0a0;
  
  /* 功能色 */
  --color-success: #3a7d0a;
  --color-danger: #d4380d;
  --color-warning: #d4a017;
}
```

---

## 三、字体系统

### 3.1 字体族

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
```

### 3.2 字号规范

| 名称 | 大小 | 用途 |
|------|------|------|
| `--font-size-h1` | `1.5rem` (24px) | 页面主标题 |
| `--font-size-h2` | `1.05rem` (17px) | 卡片标题 |
| `--font-size-title` | `1rem` (16px) | 区块标题 |
| `--font-size-base` | `0.95rem` (15px) | 正文、按钮 |
| `--font-size-sm` | `0.9rem` (14px) | 标签、次要文字 |
| `--font-size-xs` | `0.85rem` (14px) | 辅助文字 |
| `--font-size-mini` | `0.8rem` (13px) | 小标签 |
| `--font-size-tiny` | `0.75rem` (12px) | 提示文字 |

### 3.3 字重规范

| 名称 | 值 | 用途 |
|------|------|------|
| `--font-weight-normal` | `400` | 正文 |
| `--font-weight-medium` | `500` | 标签、强调 |
| `--font-weight-semibold` | `600` | 按钮、链接、重要文字 |
| `--font-weight-bold` | `700` | 标题、卡片名 |
| `--font-weight-bolder` | `800` | 排名数字、极重要文字 |

---

## 四、间距系统

### 4.1 间距规范

| 名称 | 大小 | 用途 |
|------|------|------|
| `--spacing-xs` | `4px` | 紧凑间距、图标与文字 |
| `--spacing-sm` | `6px` | 小间距 |
| `--spacing-md` | `8px` | 常规间距 |
| `--spacing-lg` | `10px` | 中等间距 |
| `--spacing-xl` | `12px` | 大间距 |
| `--spacing-2xl` | `14px` | 区块内间距 |
| `--spacing-3xl` | `16px` | 卡片内边距、区块间距 |
| `--spacing-4xl` | `20px` | 大区块间距 |

### 4.2 常用场景

```css
/* 卡片内边距 */
padding: 16px;

/* 区块间距 */
margin-bottom: 16px;

/* 表单项间距 */
margin-bottom: 14px;

/* 按钮组间距 */
gap: 8px;

/* 图标与文字间距 */
gap: 6px;
```

---

## 五、圆角系统

| 名称 | 大小 | 用途 |
|------|------|------|
| `--radius-sm` | `4px` | 进度条、小组件 |
| `--radius-md` | `6px` | 小按钮、输入框 |
| `--radius-lg` | `8px` | 按钮、输入框、小组件 |
| `--radius-xl` | `10px` | 卡片、图片框 |
| `--radius-2xl` | `12px` | 区块、大卡片 |
| `--radius-full` | `20px` | 标签、药丸按钮 |
| `--radius-circle` | `50%` | 圆形按钮、头像 |

---

## 六、阴影系统

| 名称 | 值 | 用途 |
|------|------|------|
| `--shadow-sm` | `0 2px 8px rgba(92,58,33,0.06)` | 卡片、轻微浮起 |
| `--shadow-md` | `0 2px 8px rgba(92,58,33,0.08)` | 区块、中等浮起 |
| `--shadow-lg` | `0 8px 30px rgba(92,58,33,0.18)` | 弹窗、模态框 |
| `--shadow-xl` | `0 8px 40px rgba(92,58,33,0.2)` | 浮层面板 |

---

## 七、组件规范

### 7.1 按钮

**主要按钮**
```css
.btn-primary {
  padding: 10px 20px;
  background: #8b5e3c;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover { background: #6d4a2f; }
.btn-primary:disabled { opacity: 0.5; cursor: default; }
```

**次要按钮**
```css
.btn-secondary {
  padding: 10px 20px;
  background: #e8ddd0;
  color: #5c3a21;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
}
.btn-secondary:hover { background: #d4c4b0; }
```

**危险按钮**
```css
.btn-danger {
  padding: 10px 20px;
  background: #fff;
  color: #d4380d;
  border: 2px solid #f5c4b8;
  border-radius: 8px;
}
.btn-danger:hover { 
  background: #fef2f0; 
  border-color: #d4380d; 
}
```

**小按钮**
```css
.btn-sm {
  padding: 6px 14px;
  font-size: 0.8rem;
}
```

**渐变按钮（AI按钮）**
```css
.ai-btn {
  padding: 12px 28px;
  background: linear-gradient(135deg, #8b5e3c, #d4a017);
  color: #fff;
  border: none;
  border-radius: 8px;
}
```

### 7.2 输入框

**文本输入**
```css
.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #d4c4b0;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus { border-color: #8b5e3c; }
.form-input::placeholder { color: #c4b0a0; }
```

**文本域**
```css
.note-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d4c4b0;
  border-radius: 6px;
  font-size: 0.85rem;
  resize: vertical;
  min-height: 36px;
}
```

### 7.3 卡片

**基础卡片**
```css
.section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(92,58,33,0.08);
}
```

**茶样卡片**
```css
.tea-card {
  background: #faf6f1;
  border: 2px solid #e8ddd0;
  border-radius: 10px;
  padding: 14px;
}
```

**AI分析卡片**
```css
.ai-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px rgba(92,58,33,0.06);
  border-left: 4px solid #8b5e3c;
}
```

### 7.4 表格

```css
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
th, td {
  padding: 10px 8px;
  text-align: center;
  border: 1px solid #e0d5c8;
}
th {
  background: #8b5e3c;
  color: #fff;
  font-weight: 600;
}
tr:nth-child(even) { background: #faf6f1; }
tr:hover { background: #f0e6d9; }
```

### 7.5 标签

**药丸标签**
```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f0e6d9;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #5c3a21;
}
```

**Tab标签**
```css
.tab-btn {
  padding: 10px;
  border: none;
  background: #fff;
  color: #8b5e3c;
  font-weight: 600;
  cursor: pointer;
}
.tab-btn.active {
  background: #8b5e3c;
  color: #fff;
}
```

### 7.6 提示框

**成功提示**
```css
.status-msg.ok {
  background: #f0f9eb;
  color: #3a7d0a;
  border: 1px solid #c8e6a8;
  padding: 10px 14px;
  border-radius: 8px;
}
```

**错误提示**
```css
.status-msg.err {
  background: #fef2f0;
  color: #d4380d;
  border: 1px solid #f5c4b8;
  padding: 10px 14px;
  border-radius: 8px;
}
```

**提示框**
```css
.tip-box {
  background: #fff9e6;
  border-left: 4px solid #d4a017;
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
  color: #6d5a20;
}
```

### 7.7 排名条

```css
.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: #faf6f1;
  border: 2px solid #e8ddd0;
}
.rank-item.gold { border-color: #d4a017; background: #fff9e6; }
.rank-item.silver { border-color: #a0a0a0; background: #f8f8f8; }
.rank-item.bronze { border-color: #b87333; background: #fdf3ec; }

.rank-bar-bg {
  height: 8px;
  background: #e8ddd0;
  border-radius: 4px;
}
.rank-bar {
  background: linear-gradient(90deg, #8b5e3c, #d4a017);
  border-radius: 4px;
}
```

---

## 八、动画规范

### 8.1 过渡时间

| 名称 | 时长 | 用途 |
|------|------|------|
| `--transition-fast` | `0.15s` | 快速响应（缩放、颜色） |
| `--transition-normal` | `0.2s` | 标准过渡（背景、边框） |
| `--transition-slow` | `0.3s` | 慢速过渡（弹窗出现） |
| `--transition-slower` | `0.5s` | 很慢过渡（进度条） |

### 8.2 常用动画

**光标闪烁**
```css
@keyframes blink { 
  0%, 100% { opacity: 1; } 
  50% { opacity: 0; } 
}
```

**脉冲动画**
```css
@keyframes pulse {
  0%, 100% { box-shadow: 0 4px 16px rgba(92,58,33,0.3); }
  50% { box-shadow: 0 4px 24px rgba(92,58,33,0.6), 0 0 0 8px rgba(139,94,60,0.2); }
}
```

---

## 九、响应式断点

| 名称 | 宽度 | 用途 |
|------|------|------|
| 移动端 | `< 480px` | 手机竖屏 |
| 平板 | `480px - 768px` | 手机横屏、小平板 |
| 桌面 | `> 768px` | 电脑 |

**最大宽度**
- 品鉴页面：`960px`
- 管理后台：`720px`

---

## 十、图标使用

本项目使用Emoji作为图标，保持简洁统一：

| 场景 | Emoji |
|------|-------|
| 茶/品鉴 | 🍵 |
| 设置/配置 | ⚙️ |
| 删除 | ✕ |
| 返回 | ← |
| AI | 🤖 |
| 排名 | 🏆 |
| 金牌 | 🥇 |
| 银牌 | 🥈 |
| 铜牌 | 🥉 |
| 相机 | 📷 |
| 提示 | 💡 |
| 警告 | ⚠️ |
| 成功 | ✅ |
| 文件 | 📄 |
| 备份 | 📦 |

---

## 十一、新增功能开发指南

### 11.1 开发步骤

1. **使用CSS变量**：优先使用定义好的变量，保持一致性
2. **遵循组件规范**：复用已有组件样式
3. **保持色调统一**：使用茶色系作为主色调
4. **注意圆角一致性**：按钮8px，卡片10-12px
5. **适度使用阴影**：轻微浮起效果

### 11.2 代码模板

```html
<!-- 新增区块模板 -->
<div class="section">
  <div class="section-title">📌 区块标题</div>
  <!-- 内容 -->
</div>

<!-- 表单模板 -->
<div class="form-group">
  <label class="form-label">标签名称</label>
  <input class="form-input" type="text" placeholder="占位提示">
  <div class="form-hint">辅助说明文字</div>
</div>

<!-- 按钮组模板 -->
<div class="btn-group">
  <button class="btn btn-primary">主要操作</button>
  <button class="btn btn-secondary">次要操作</button>
</div>
```

---

## 十二、示例页面结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>页面标题</title>
  <style>
    /* 引入设计系统变量 */
    :root { /* ... 见上文 ... */ }
    
    /* 基础重置 */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--color-bg-page);
      color: var(--color-text-primary);
      padding: 16px;
      max-width: 960px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <h1>🍵 页面标题</h1>
  <p class="subtitle">副标题说明</p>
  
  <div class="section">
    <div class="section-title">📌 区块标题</div>
    <!-- 区块内容 -->
  </div>
</body>
</html>
```
