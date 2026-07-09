# ASMR Player — 沉浸式同人音声播放器

[![Electron](https://img.shields.io/badge/Electron-35.x-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Web_Audio_API-✓-9b6dff)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

一款专为 RJ 同人音声作品设计的桌面播放器，支持多目录树形浏览、路线选择、双耳可视化、10 段均衡器、独立声道控制及多格式字幕系统。

![screenshot](https://img.shields.io/badge/screenshot-coming_soon-9b6dff)

---

## 特性

### 🎵 音频引擎
- 基于 Web Audio API 构建，支持 WAV/MP3/FLAC/OGG/M4A 格式
- 独立左右声道增益控制（ChannelSplitter/ChannelMerger）
- 10 段均衡器（32Hz–16kHz），4 种预设（Flat/Vocal/Bass/ASMR）
- 频谱分析器 + 平衡指示点实时可视化

### 📝 字幕系统
- 多格式支持：VTT / LRC / SRT / ASS / SSA / TXT（自动格式嗅探）
- 智能增强：角色识别、耳元方向（L/R）、情感语气分类、动作标注
- 独立浮动字幕面板：可拖拽、毛玻璃背景、点击穿透文本
- 完整台本视图：自动滚动、角色着色、点击跳转播放

### 📂 媒体库
- 树形目录结构展示，保留作品原始层级
- SE 变体目录自动过滤（无效果音/無音/MP3版等）
- 路线检测：自动识别 `【A路线】/【B路线】/ルートA/B` 等分支目录
- 路线选择：选中路线后按路线顺序播放
- 递归封面搜索：自动匹配 `封面/cover/イラスト` 等关键词
- 11 部 RJ 作品 × 237+ 音轨实测通过

### 🎛 控制面板
- 播放模式：顺序 / 列表循环 / 单曲循环 / 随机
- 进度条：拖拽时静音，松手跳转恢复
- 声道控制：SVG 头部示意 + 平衡滑块 + 独立 L/R 调节
- 音量：悬停弹出滑块，200ms 延迟隐藏
- 键盘快捷键：Space(播放/暂停) / ←→(±5秒) / ↑↓(音量) / C(字幕切换)

### 🎨 界面
- 暗紫沉浸主题 + 毛玻璃效果（backdrop-filter）
- 自适应尺寸系统：全部尺寸使用 `clamp()` 响应式
- 无窗口边框：自定义 SVG 标题栏 + 窗口控制
- CSS 变量体系：颜色/间距/字体/控件尺寸一次定义全局生效

---

## 安装

### 下载预构建包

从 [Releases](https://github.com/user/asmr-player/releases) 下载：

| 文件 | 说明 |
|---|---|
| `ASMR Player-Setup-1.0.0.exe` | NSIS 安装包（82.4 MB） |
| `win-unpacked/` | 便携版，解压即用（191.9 MB） |

### 从源码构建

```bash
# 克隆
git clone https://github.com/user/asmr-player.git
cd asmr-player

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 构建便携包 + 安装包
npm run dist
```

---

## 使用指南

### 首次使用

1. 启动后自动扫描 `Music` 目录
2. 左侧媒体库显示所有扫描到的作品
3. 点击展开目录树，点击音轨开始播放

### 手动添加

- 点击标题栏的文件夹图标选择文件/目录
- 或直接拖拽文件夹到应用窗口

### 操作一览

| 区域 | 操作 |
|---|---|
| 标题栏 | 左侧 Logo，中部"打开"按钮，右侧窗口控制 |
| 左侧边栏 | 5 个标签页：媒体库 / 台本 / 字幕设置 / 声道 / 均衡器 |
| 媒体库 | 作品卡片（封面+名称），展开树形目录浏览音轨 |
| 主区域 | 封面大图 + 角色标签 + 频谱可视化 + 播放控制 |
| 播放控制 | 音轨信息 / 进度条（悬停显示时间）/ 播放模式 / 音量 |

### 分支路线作品

对于包含 `【A路线】/【B路线】` 等子目录的作品：

1. 展开目录树找到路线目录
2. 点击路线目录将其**选中为当前路线**（紫色高亮）
3. 点击路线下的音轨开始播放
4. `上一首/下一首` 将沿该路线顺序播放

---

## 技术架构

```
asmr-player/
├── electron/
│   ├── main.ts              # 主进程：窗口管理、文件扫描、IPC
│   └── preload.ts           # 预加载：contextBridge API
├── src/
│   ├── engine/
│   │   └── AudioEngine.ts   # 音频引擎（单例）
│   ├── subtitle/
│   │   ├── SubtitleParser.ts    # 字幕解析器
│   │   ├── SubtitleEnhancer.ts  # 智能增强引擎
│   │   └── SubtitleTrack.ts     # 字幕轨道管理
│   ├── hooks/
│   │   ├── useAudioEngine.ts    # 音频引擎 React 绑定
│   │   ├── usePlaylist.ts       # 播放列表状态 + 路线选择
│   │   └── useSettings.ts       # 设置持久化
│   ├── contexts/
│   │   └── SubtitleContext.tsx   # 字幕设置上下文
│   ├── components/
│   │   ├── Player/         # 播放器控件
│   │   ├── Playlist/       # 媒体库 + 树形视图
│   │   ├── Subtitle/       # 字幕面板 + 台本
│   │   └── ASMR/           # 可视化 + 声道 + 均衡器
│   ├── layouts/
│   │   └── AppLayout.tsx   # 布局组件
│   ├── styles/
│   │   ├── theme.css       # CSS 变量系统
│   │   └── types.ts        # 类型安全样式
│   └── App.tsx             # 应用主入口
```

### 关键设计决策

| 决策 | 说明 |
|---|---|
| **音频引擎单例** | 全局唯一 AudioContext，避免浏览器限制 |
| **树形扫描** | 保留目录结构，支持分支路线和 SE 变体过滤 |
| **loadId 防竞态** | 递增 ID 丢弃过期异步请求 |
| **onended 处理** | `stop()` 时清空 `onended` 防止异步回掉覆盖状态 |
| **CSS 变量 + clamp()** | 全部尺寸响应式，无硬编码像素 |
| **子标题上下文** | 20 个 prop 收敛为 1 个 Context |
| **类型安全样式** | `csstype` + `Styles` 类型覆盖全部组件 |

---

## 配置

设置存储在 `localStorage` 中，键名为 `asmr-player-settings`，包含：

- 音量、声道平衡
- EQ 预设及自定义频段
- 播放模式
- 字幕字体/透明度/背景/位置/显示选项
- 字幕面板浮动位置

---

## 开发

```bash
# 启动开发服务器（热重载）
npm run dev

# 构建
npm run build

# 打包分发
npm run dist:dir     # 便携版
npm run dist:nsis    # 安装包
```

> **注意**：`electron-builder` 的 `--dir` 步骤中 `rcedit` 存在已知 bug（空字符串参数），但 ASAR 文件在报错前已生成，`--prepackaged` 方式可正常构建。

---

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | Electron 35 + React 18 |
| 语言 | TypeScript 5 |
| 构建 | Vite 6 + vite-plugin-electron |
| 音频 | Web Audio API (AudioContext, GainNode, BiquadFilterNode, AnalyserNode, ChannelSplitter/Merger) |
| 样式 | CSS 变量 + 内联类型安全样式 (csstype) |
| 打包 | electron-builder 25 (NSIS) |

---

## 许可证

MIT License

Copyright © 2026
