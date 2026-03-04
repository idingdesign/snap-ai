# SnapAI 🚀

桌面截图翻译 & AI 查询工具（Windows / macOS）

使用快捷键截图，由 AI 完成翻译或内容解释。支持阿里千问、火山方舟、月之暗面 Kimi 及自定义 API。

---

## 功能

- 📸 **快捷键截图** — 框选区域，无需打开浏览器
- 🌐 **AI 翻译** — 中英文自动识别，精准互译
- 💡 **AI 解释** — 理解代码、图表、公式、截图内容
- 🔍 **联网查询** — 利用各平台联网搜索能力
- ⏱ **历史记录** — 保存截图+结果，可搜索和收藏
- ⌨️ **自定义快捷键** — 所有快捷键均可在设置中修改

## 支持的 AI 服务

| 服务 | 默认模型 |
|------|---------|
| 阿里千问（默认） | qwen-vl-plus |
| 火山方舟 | doubao-seed-1-8-251228 |
| 月之暗面 Kimi | kimi-k2.5 |
| 自定义 | OpenAI 兼容接口 / Ollama |

## 快捷键

| 操作 | 默认快捷键 |
|------|-----------|
| 截图 → 翻译 | `Ctrl+Shift+T` / `Cmd+Shift+T` |
| 截图 → 解释 | `Ctrl+Shift+E` / `Cmd+Shift+E` |
| 历史记录 | `Ctrl+Shift+H` / `Cmd+Shift+H` |
| 取消截图 | `Esc` |

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装 & 运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev
```

### 构建打包

```bash
# Windows (.exe)
npm run build:win

# macOS (.dmg)
npm run build:mac
```

### 首次使用

1. 启动应用，在系统托盘找到 SnapAI 图标
2. 右键 → 设置，填写 AI 服务的 API Key
3. 使用快捷键开始截图翻译

## 配置文件位置

- **Windows**: `%APPDATA%\snap-ai-config`
- **macOS**: `~/Library/Application Support/snap-ai-config`

## 开源协议

MIT License
