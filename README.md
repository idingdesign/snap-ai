# SnapAI

桌面截图 + AI 解释 / 翻译工具（Windows / macOS）

按下快捷键，框选屏幕任意区域，AI 立即完成解释或翻译。

---

## 功能特性

- 📸 **一键截图** — 全局快捷键，框选任意区域即触发
- 💡 **AI 解释** — 理解代码、图表、公式、产品截图（默认模式）
- 🌐 **AI 翻译** — 中英文自动识别，支持切换目标语言
- 🔄 **模式切换** — 结果窗口顶部可随时在解释/翻译间切换，无需重新截图
- 📋 **文字可选** — 输出内容支持鼠标划选、复制
- 🌗 **亮/暗主题** — 跟随系统外观自动切换
- 📂 **历史记录** — 查看并收藏历次 AI 输出
- ⌨️ **自定义快捷键** — 所有快捷键均可在设置中修改
- 🚀 **开机自启** — 可配置登录后自动在后台运行

## 支持的 AI 服务

| 服务 | 默认模型 |
|------|---------|
| 阿里千问（默认） | qwen-vl-plus |
| 火山方舟 | doubao-seed-1-8-251228 |
| 月之暗面 Kimi | kimi-k2.5 |
| 自定义 | OpenAI 兼容接口 / Ollama |

同一时间只使用一个 AI 服务，密钥独立保存，随时切换。

## 快捷键

| 操作 | 默认快捷键 |
|------|-----------|
| 截图（解释/翻译） | `Ctrl+Shift+S` / `Cmd+Shift+S` |
| 历史记录 | `Ctrl+Shift+H` / `Cmd+Shift+H` |
| 取消截图 | `Esc` |

> 截图后，在结果窗口顶部可切换**解释**或**翻译**模式，翻译模式还可选择目标语言。

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装 & 运行

```bash
npm install
npm run dev
```

### 构建安装包

```bash
# Windows (.exe)
npm run build:win

# macOS (.dmg)
npm run build:mac
```

### 首次使用

1. 启动应用，系统托盘出现 SnapAI 图标
2. 右键图标 → **设置** → 填写 AI 服务的 API Key
3. 按快捷键 `Ctrl+Shift+S` 开始截图

## 配置文件位置

- **Windows**: `%APPDATA%\snap-ai\config.json`
- **macOS**: `~/Library/Application Support/snap-ai/config.json`

## 开源协议

MIT License
