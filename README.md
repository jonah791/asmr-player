# 🎧 ASMR Player — 沉浸式同人音声播放器

<div align="center">

### 专为 RJ 同人音声作品打造的桌面播放器

[![Electron](https://img.shields.io/badge/Electron-35.x-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Web_Audio_API-✓-9b6dff)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![GitHub Release](https://img.shields.io/github/v/release/jonah791/asmr-player?color=9b6dff)](https://github.com/jonah791/asmr-player/releases)

**你的 RJ 音声收藏最佳伴侣** — 树形目录管理 · 多格式字幕 · 双耳可视化 · 10段均衡器 · 分支路线选择

</div>

---

> **💡 什么是 RJ 同人音声？** 日本同人社团制作的 ASMR 音声作品，通常以 RJ 编号标识，包含耳语、助眠、角色扮演等沉浸式内容。本播放器专为此类作品的目录结构和播放习惯设计。

---

## ✨ 特性一览

### 🎵 音频引擎
- 基于 Web Audio API，支持 WAV / MP3 / FLAC / OGG / M4A / WMA / AAC
- 独立左右声道增益（ChannelSplitter/ChannelMerger）
- 10 段均衡器（32Hz–16kHz），预设 Flat / Vocal / Bass / ASMR
- 实时频谱分析 + 平衡指示点可视化

### 📜 多格式字幕
- 支持 VTT · LRC · SRT · ASS · SSA · TXT（自动格式嗅探）
- 智能增强引擎：角色识别 👤、耳元方向 ←L/R→、情感分类（耳语/诱惑/命令）🎭
- 动作标注（舔耳·耳吹·接吻 等）
- 独立浮动字幕面板：可拖拽、毛玻璃背景、点击穿透
- 完整台本视图：自动滚动、角色着色、**点击任意台词跳转播放**
- 🔄 **内嵌字幕提取**：自动读取 MP3 文件中 ID3v2 SYLT 同步歌词，转为 LRC 字幕

### 🌐 ASMR.one 在线资源
- **浏览**：连接 Kikoeru 服务器（官方 ASMR.one / 自建），浏览作品列表
- **搜索**：按关键词搜索 RJ 作品、声优、社团
- **排序筛选**：按发布日期/评分/下载数/随机排序，支持升降序
- **中文字幕筛选**：自动检测作品翻译语言和标签，仅显示中文作品
- **热度排行**：🔥 热度 Tab 按下载数排行
- **在线播放**：▶ 一键远程流式播放，无需下载
- **远程字幕**：自动拉取在线字幕文件（VTT/LRC）
- **下载**：一键下载音轨到本地 `Music/ASMR.one/` 目录
- **收藏**：本地收藏管理，无需登录即可收藏作品
- **无限滚动**：下拉自动加载更多
- **文件夹结构**：音轨列表保留在线目录层级
- **游客模式**：无需账号即可浏览，登录可获取扩展功能
- **多域名容错**：自动尝试 `api.asmr-200.com` → `api.asmr.one` → `api.asmr-100.com`
- **代理支持**：自动读取 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量，支持系统代理

### 📂 媒体库 —— 专为 RJ 作品设计
- **树形目录结构**：保留作品原始文件夹层级
- **SE 变体自动过滤**：无效果音/無音/mp3版 自动隐藏
- **分支路线检测**：自动识别 `【A路线】/【B路线】/ルートA` 等分支目录
- **路线选择**：选中路线后上一首/下一首沿路线顺序播放
- **封面自动搜索**：递归扫描 `封面/イラスト/插画` 等目录
- 11 部 RJ 作品 × 237+ 音轨实测通过

### 🎛 专业控制面板
- 播放模式：顺序 / 列表循环 / 单曲循环 / 随机
- 进度条：拖拽静音 → 松手跳转恢复，悬停显示时间戳
- 声道控制：SVG 头部示意 + 平衡滑块 + 独立 L/R 调节
- 10 段均衡器：Canvas 拖拽曲线，实时调节
- 音量悬停弹出：200ms 延迟隐藏

### ⌨️ 键盘快捷键
| 按键 | 功能 |
|------|------|
| `Space` | 播放/暂停 |
| `←` / `→` | 后退/快进 5 秒 |
| `↑` / `↓` | 增大/减小音量 |
| `C` | 切换字幕显示 |

### 🎨 暗紫沉浸主题
- 毛玻璃（backdrop-filter） + 紫色渐变
- 自适应尺寸系统：全 `clamp()` 响应式
- 无边框窗口：自定义 SVG 标题栏
- CSS 变量体系，全局风格统一
- 独立浮动字幕面板：可拖拽、毛玻璃背景、点击穿透文本
- 完整台本视图：自动滚动、角色着色、点击跳转播放

---

## 📦 安装

### 下载预构建包

从 [Releases](https://github.com/jonah791/asmr-player/releases) 下载：

| 文件 | 说明 | 大小 |
|---|---|---|
| `ASMR Player-Setup-1.1.0.exe` | NSIS 安装包 | ~82 MB |
| `ASMR-Player-Portable-1.1.0.zip` | 便携版，解压即用 | ~114 MB |

### 从源码构建

```bash
git clone https://github.com/jonah791/asmr-player.git
cd asmr-player

# 中国大陆用户建议配置镜像
npm config set registry https://registry.npmmirror.com
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

npm install
npm approve-scripts electron esbuild
npm run dev          # 开发模式（热重载）
npm run build        # 生产构建
npm run electron:build  # 打包安装包 + 便携包
```

---

## 🚀 快速开始

### 本地播放
1. 启动后自动扫描 `Music` 目录下的 RJ 作品
2. 左侧边栏点击 **媒体库** 标签
3. 点击作品展开**树形目录**，点击任意音轨开始播放
4. 也可以点击标题栏「打开」按钮或拖拽文件夹导入

### 在线浏览（ASMR.one）
1. 点击侧边栏 **ASMR.one** 按钮
2. 选择「**游客访问**」无需账号，或登录获取更多功能
3. 浏览作品网格，使用排序/筛选/中文过滤
4. 点击作品查看详情和音轨列表（保留文件夹层级）
5. 点击 **▶** 在线播放，点击 **↓** 下载到本地
6. 点击 **♥** 收藏作品，在收藏 Tab 中统一查看

### 代理配置（可选）
如果网络需要代理，启动前设置环境变量：

```bash
# CMD
set HTTPS_PROXY=http://127.0.0.1:7890
ASMR Player.exe

# PowerShell
$env:HTTPS_PROXY="http://127.0.0.1:7890"
.\ASMR Player.exe
```

### 分支路线作品
对于包含 `【A路线】/【B路线】` 等分支目录的作品：
1. 展开树找到路线目录
2. **点击路线目录**将其选中（紫色高亮）
3. 点击该路线下的音轨播放
4. 上一首/下一首将沿该路线顺序播放

### 台本跳转
在台本面板中点击任意台词 → 自动跳转到该时间点开始播放

---

## 🧱 技术架构

```
asmr-player/
├── electron/
│   ├── main.ts              # 主进程：窗口管理、文件扫描、IPC 处理
│   ├── preload.ts           # 预加载：安全的 contextBridge API
│   └── asmrApi.ts           # ASMR.one HTTP 客户端 + 代理支持 + 下载管理
├── src/
│   ├── engine/
│   │   └── AudioEngine.ts   # 🎵 音频引擎（单例）：播放/暂停/seek/EQ/声道分离/分析器
│   ├── subtitle/
│   │   ├── SubtitleParser.ts    # 📜 统一字幕解析器（VTT/LRC/SRT/ASS/TXT）
│   │   ├── SubtitleEnhancer.ts  # 🤖 智能增强引擎：角色/耳元/语气/动作
│   │   └── SubtitleTrack.ts     # 📚 多轨道字幕管理
│   ├── hooks/
│   │   ├── useAudioEngine.ts    # ⚡ 音频引擎 React 绑定
│   │   ├── usePlaylist.ts       # 📋 播放列表 + 路线选择
│   │   └── useSettings.ts       # ⚙️ 设置持久化（localStorage）
│   ├── contexts/
│   │   └── SubtitleContext.tsx   # 🔄 字幕设置上下文（20 prop → 0 prop）
│   ├── components/
│   │   ├── Player/              # ▶️ 播放器控件 + 标题栏
│   │   ├── Playlist/            # 📂 媒体库 + 树形视图
│   │   ├── Subtitle/            # 📝 字幕面板 + 台本视图
│   │   └── ASMR/                # 📊 可视化 + 声道控制 + 均衡器 + ASMR.one 面板
│   ├── layouts/
│   │   └── AppLayout.tsx        # 🏗 布局组件
│   ├── styles/
│   │   ├── theme.css            # 🎨 CSS 变量系统（全响应式）
│   │   └── types.ts             # 🔒 类型安全样式（csstype）
│   └── App.tsx                  # 📱 应用主入口
```

### 关键设计

| 决策 | 说明 |
|---|---|
| **音频引擎单例** | 全局唯一 AudioContext，避免浏览器 6 节点限制 |
| **树形扫描** | 保留目录原始结构，支持分支路线 / SE 变体过滤 |
| **loadId 防竞态** | 递增 ID 丢弃过期异步请求，防止快速连击跳错 |
| **onended 安全处理** | `stop()` 时清空回调，防止异步覆盖 React 状态 |
| **CSS 变量 + clamp()** | 全部尺寸随窗口自适应，无硬编码 |
| **类型安全样式** | csstype 覆盖全部 10 个组件，消除 `Record<string, any>` |
| **内嵌字幕提取** | 通过 music-metadata 解析 ID3v2 SYLT，缓存为 LRC |
| **代理穿透** | 三层代理支持：Chromium 命令行 + session API + Node.js fetch |

---

## ⚙️ 配置

设置自动保存至 `localStorage`（键名 `asmr-player-settings`），包含：

- 音量 / 声道平衡
- EQ 预设及自定义频段
- 播放模式
- 字幕字体 / 透明度 / 背景 / 位置 / 显示选项
- 字幕面板浮动位置

ASMR.one 配置保存至 `userData/asmr-config.json`，包含：
- 服务器地址
- Token（登录时）
- 游客模式标记

---

## 🛠 开发

```bash
npm run dev              # 启动开发服务器 + Electron
npm run build            # 生产构建
npm run electron:dir     # 构建解压目录（跳过 rcedit）
npm run electron:build   # 完整打包（NSIS + Portable）
```

> **注意**：`electron-builder` 的 rcedit 步骤存在已知 bug（空字符串参数 + 非 ASCII 描述文字），不影响 ASAR 生成。使用 `electron:dir` 可跳过此步骤，手动压缩 `release/win-unpacked` 得到便携版。

---

## 📊 项目状态

- ✅ **核心引擎**：播放/暂停/seek/EQ/声道分离 — 稳定
- ✅ **字幕系统**：7 格式解析 + 智能增强 + 浮动面板 + 台本 — 稳定
- ✅ **媒体库**：树形扫描 + SE 过滤 + 路线检测 — 稳定
- ✅ **可视化**：频谱 + 双耳平衡指示 — 稳定
- ✅ **ASMR.one 集成**：浏览 + 搜索 + 排序 + 中文筛选 + 在线播放 + 下载 + 收藏 — 稳定
- ✅ **远程字幕**：在线播放自动拉取 VTT/LRC 字幕 — 稳定
- ✅ **内嵌字幕提取**：MP3 SYLT → LRC 自动转换 — 稳定
- ✅ **代理支持**：HTTPS_PROXY + Chromium 代理 — 稳定
- ✅ **性能优化**：Throttle 控制 + ErrorBoundary 防竞态 — 已处理
- 🔄 **虚拟滚动**：作品 > 20 时推荐优化（后续版本）

---

## 📄 许可证

本软件采用 **个人非商业许可证**。

- ✅ 个人学习、研究、非商业使用 — 自由
- ❌ 商业用途、销售、集成商业产品 — 需授权
- 详见 [LICENSE](./LICENSE)

Copyright © 2026 [jonah791](https://github.com/jonah791)

---

> **⭐ 如果这个项目对你有帮助，欢迎 Star 支持！**
