# Character Editor 设计文档

## 概述

一个像素角色编辑器，支持读写 JSON 文件、预览 JSON 为像素图、调整像素颗粒/颜色/调色板/风格，并接入 DeepSeek AI 进行智能编辑。

技术栈：React + Vite + TypeScript + Node.js

---

## 目录

1. [系统架构](#系统架构)
2. [数据模型](#数据模型)
3. [API 设计](#api-设计)
4. [UI 结构与交互](#ui-结构与交互)
5. [核心模块设计](#核心模块设计)
6. [AI 集成](#ai-集成)
7. [目录结构](#目录结构)
8. [依赖清单](#依赖清单)

---

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                    │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ 素材栏    │  │  画布区域     │  │  AI Chat 面板  │  │
│  │ AssetBar │  │  CanvasArea  │  │  AIChatPanel  │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
│  ┌──────────────────────────────────────────────────┐ │
│  │             顶部操作栏 TopToolbar                 │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼──────────────────────────────┐
│                 Vite Dev Server (Proxy)               │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Express API Server (Node.js)             │
│                                                      │
│  /api/assets     → 文件扫描与读取                     │
│  /api/asset/:id  → 单文件 CRUD                        │
│  /api/config     → 配置管理                           │
│  /api/export     → 图片导出                           │
│  /api/ai/chat    → DeepSeek AI 对话 (SSE)            │
│  /api/ai/edit    → DeepSeek AI JSON 编辑             │
└──────────────────────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  DeepSeek API   │
              │  (chat model)   │
              └─────────────────┘
```

### 架构分层

| 层级 | 职责 | 技术 |
|------|------|------|
| 前端展示层 | UI 渲染、交互、状态管理 | React + TypeScript |
| 像素渲染层 | JSON → Canvas 像素图渲染 | Canvas API |
| API 代理层 | 请求转发、SSE 流处理 | Vite proxy |
| 后端服务层 | 文件系统操作、AI 调用 | Express + Node.js |
| AI 层 | 智能对话、JSON 编辑建议 | DeepSeek API |

---

## 数据模型

### PixelAsset（像素素材 JSON 文件格式）

```typescript
interface PixelAsset {
  /** 素材名称 */
  name: string;
  /** 像素数据：二维数组，每个元素是 hex RGBA 颜色值 */
  pixels: string[][];  // 例: [["#FF0000FF", "#00FF00FF"], ["#0000FFFF", "#00000000"]]
  /** 元数据（可选） */
  meta?: {
    /** 作者 */
    author?: string;
    /** 描述 */
    description?: string;
    /** 标签 */
    tags?: string[];
    /** 调色板（用到的颜色列表） */
    palette?: string[];
    /** 创建时间 */
    createdAt?: string;
    /** 更新时间 */
    updatedAt?: string;
  };
}
```

**pixels 颜色格式说明**：
- 格式：`#RRGGBBAA`（8位 hex，带透明度）
- 例：`#FF0000FF` = 红色不透明，`#00000000` = 完全透明
- 空像素使用 `#00000000` 表示

### AppConfig（应用配置）

```typescript
interface AppConfig {
  /** JSON 文件夹路径 */
  assetFolderPath: string;
  /** DeepSeek API Key */
  deepseekApiKey?: string;
  /** DeepSeek 模型名称 */
  deepseekModel: string;  // 默认: "deepseek-chat"
  /** 默认像素颗粒大小 (px) */
  defaultPixelSize: number;  // 默认: 16
  /** 默认调色板 */
  defaultPalette: string[];
  /** 画布网格显示 */
  showGrid: boolean;  // 默认: true
  /** 画布背景色 */
  canvasBgColor: string;  // 默认: "#222222"
}
```

### CanvasItem（画布上的元素）

```typescript
interface CanvasItem {
  /** 唯一ID */
  id: string;
  /** 对应的素材文件路径 */
  assetPath: string;
  /** 画布上的位置 */
  x: number;
  y: number;
  /** 缩放比例 */
  scale: number;
  /** 渲染后的像素数据快照 */
  pixelData: PixelAsset;
}
```

### AIChatMessage（AI 对话消息）

```typescript
interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** 关联的素材路径 */
  relatedAssetPath?: string;
  /** AI 建议的 JSON 变更 */
  suggestedChange?: {
    path: string;      // 素材文件路径
    originalJson: PixelAsset;
    modifiedJson: PixelAsset;
  };
}
```

---

## API 设计

### 文件系统 API

#### `GET /api/assets`
扫描配置文件夹中的所有 JSON 素材文件。

**Response:**
```json
{
  "assets": [
    {
      "name": "warrior",
      "path": "/data/characters/warrior.json",
      "width": 16,
      "height": 16,
      "preview": "data:image/png;base64,..."  // 缩略图 base64
    }
  ],
  "folderPath": "/data/characters"
}
```

#### `GET /api/asset?path=:filePath`
读取单个素材 JSON 文件。

**Response:** `PixelAsset` JSON

#### `PUT /api/asset`
写入/更新素材 JSON 文件。

**Body:**
```json
{
  "path": "/data/characters/warrior.json",
  "data": { "name": "warrior", "pixels": [...] }
}
```

#### `POST /api/asset`
创建新素材文件。

**Body:**
```json
{
  "path": "/data/characters/new-character.json",
  "data": { "name": "new-character", "pixels": [[...]] }
}
```

#### `DELETE /api/asset?path=:filePath`
删除素材文件。

### 配置 API

#### `GET /api/config`
获取当前配置。

#### `PUT /api/config`
更新配置。

**Body:** `AppConfig` 的部分字段

### 导出 API

#### `POST /api/export`
将画布内容导出为图片。

**Body:**
```json
{
  "items": [
    { "assetPath": "...", "x": 0, "y": 0, "scale": 1 }
  ],
  "canvasWidth": 256,
  "canvasHeight": 256,
  "pixelSize": 16,
  "format": "png"
}
```

**Response:** 图片文件（binary）

### AI API

#### `POST /api/ai/chat`
与 DeepSeek 对话（SSE 流式响应）。

**Body:**
```json
{
  "messages": [
    { "role": "user", "content": "把角色的帽子改成蓝色" }
  ],
  "context": {
    "assetPath": "/data/characters/warrior.json",
    "assetData": { "name": "warrior", "pixels": [...] }
  }
}
```

**Response:** SSE 流，每条事件格式：
```
data: {"content": "我来帮你", "done": false}
data: {"content": "修改帽子颜色", "done": false}
data: {"content": "...", "done": true, "suggestedChange": { "modifiedJson": {...} }}
```

#### `POST /api/ai/edit`
AI 直接编辑 JSON（非流式，返回完整结果）。

**Body:**
```json
{
  "instruction": "把所有红色像素改为蓝色",
  "assetPath": "/data/characters/warrior.json",
  "assetData": { "name": "warrior", "pixels": [...] }
}
```

**Response:**
```json
{
  "modifiedJson": { "name": "warrior", "pixels": [...] },
  "explanation": "已将所有 #FF0000FF 替换为 #0000FFFF"
}
```

---

## UI 结构与交互

### 整体布局

```
┌──────────────────────────────────────────────────────┐
│  TopToolbar                                          │
│  [导出图片] [像素大小: 16▾] [网格: ☑] [设置⚙] [AI💬]  │
├──────┬───────────────────────────────────────────────┤
│      │                                               │
│ 素材  │              画布区域                          │
│ 栏   │           Canvas Area                         │
│ 100px│                                               │
│      │     ┌─────┐                                   │
│ ┌──┐ │     │ 拖入  │                                   │
│ │🖼│ │     │ 素材  │                                   │
│ │  │ │     └─────┘                                   │
│ └──┘ │                                               │
│ name │                                               │
│ [编辑]│                                              │
│      │                                               │
│ ┌──┐ │                                               │
│ │🖼│ │                                               │
│ └──┘ │                                               │
│ name │                                               │
│ [编辑]│                                              │
│      │                                               │
├──────┤                                               │
│ [+新] │                                               │
└──────┴───────────────────────────────────────────────┘
```

### 1. 顶部操作栏 (TopToolbar)

| 控件 | 类型 | 说明 |
|------|------|------|
| 导出图片 | Button | 弹出导出选项：格式(PNG/JPG/SVG)、尺寸、背景色 |
| 像素大小 | Select/Slider | 控制渲染像素颗粒大小 (1-64px)，默认 16 |
| 网格开关 | Checkbox | 是否显示网格线 |
| 设置 | Button | 打开设置面板 |
| AI 助手 | Button | 打开/关闭 AI Chat 侧边栏 |

### 2. 左侧素材栏 (AssetBar)

宽度固定 100px，可滚动列表。

每个素材卡片：
```
┌──────────┐
│  预览图   │  ← Canvas 渲染的缩略图，像素大小固定为 4px
│  (64x64) │
├──────────┤
│ name     │  ← 素材名称
│ [编辑]   │  ← 打开编辑弹框
└──────────┘
```

底部有 `[+新建]` 按钮，创建空白像素素材。

**交互**：
- 可拖拽素材到画布区域（drag & drop）
- 点击编辑按钮打开编辑弹框
- 右键菜单：重命名、删除、复制

### 3. 画布区域 (CanvasArea)

- 接收素材栏拖拽放置
- 支持多个素材同时放置，自由定位
- 支持平移和缩放
- 网格辅助线（可开关）
- 点击选中素材，显示边框和控制点
- 选中素材后可拖拽移动、缩放

**渲染流程**：
```
PixelAsset.pixels → Canvas 2D Context → 按像素大小填充矩形
```

### 4. 编辑弹框 (EditDialog)

点击素材的编辑按钮时弹出，Modal 全屏弹框。

```
┌──────────────────────────────────────────────────────┐
│  编辑: warrior.json                              [X] │
├──────────────────────────┬───────────────────────────┤
│                          │                           │
│   像素编辑器 + 预览       │      JSON Editor          │
│                          │                           │
│   ┌──────────────────┐   │   {                       │
│   │                  │   │     "name": "warrior",     │
│   │   Pixel Canvas   │   │     "pixels": [           │
│   │   (可点击编辑)    │   │       ["#FF0000FF", ...], │
│   │                  │   │       ...                  │
│   └──────────────────┘   │     ]                      │
│                          │   }                        │
│   工具栏:                 │                           │
│   [画笔][橡皮][取色][填充] │   [应用] [格式化] [撤销]   │
│   颜色: [#FF0000FF]       │                           │
│   调色板: [■][■][■][■]    │                           │
│                          │                           │
└──────────────────────────┴───────────────────────────┘
```

**左侧 - 像素编辑器**：
- Canvas 渲染像素图，可点击修改单个像素
- 工具栏：画笔、橡皮擦、取色器、油漆桶填充
- 颜色选择器：支持 hex RGBA 输入和可视化选择
- 调色板：快速选择常用颜色
- 缩放控制：调整编辑区放大/缩小

**右侧 - JSON Editor**：
- 使用 Monaco Editor 渲染 JSON
- 实时双向同步：像素编辑器改动 → JSON 更新，JSON 修改 → 像素预览更新
- 语法高亮、错误提示
- 应用按钮：将 JSON 修改写回文件

### 5. 设置面板 (SettingsPanel)

侧滑面板，配置应用参数。

| 配置项 | 类型 | 说明 |
|--------|------|------|
| 素材文件夹路径 | Input | Node.js 扫描的文件夹路径 |
| DeepSeek API Key | Password Input | AI 功能的 API Key |
| DeepSeek 模型 | Select | 选择 DeepSeek 模型版本 |
| 默认像素大小 | Number | 画布默认像素颗粒大小 |
| 默认调色板 | Color List | 自定义调色板颜色 |
| 画布背景色 | Color Picker | 画布背景颜色 |

### 6. AI Chat 面板 (AIChatPanel)

右侧可收起的侧边栏，宽度 320px。

```
┌──────────────────────┐
│  AI 助手 (DeepSeek)  │
├──────────────────────┤
│                      │
│  🤖 你好！我可以帮你  │
│     编辑像素素材。    │
│     试试说：          │
│     "把帽子改成蓝色"  │
│                      │
│  👤 把角色的帽子改成  │
│     蓝色              │
│                      │
│  🤖 好的，我已经将    │
│     帽子区域的像素    │
│     修改为蓝色。      │
│     [应用变更] [忽略] │
│                      │
├──────────────────────┤
│  [输入消息...]  [发送]│
│  [📎附加当前素材]     │
└──────────────────────┘
```

**功能**：
- 流式输出 AI 回复（SSE）
- 自动附加当前编辑的素材作为上下文
- AI 可返回建议的 JSON 变更，用户可选择应用或忽略
- 对话历史记录
- 快捷指令：常用编辑操作的一键触发

---

## 核心模块设计

### 1. 像素渲染器 (PixelRenderer)

负责将 `PixelAsset.pixels` 渲染到 Canvas。

```typescript
class PixelRenderer {
  /**
   * 渲染像素数据到 Canvas
   * @param ctx - Canvas 2D 上下文
   * @param pixels - 像素二维数组
   * @param pixelSize - 每个像素的渲染尺寸
   * @param options - 渲染选项
   */
  render(
    ctx: CanvasRenderingContext2D,
    pixels: string[][],
    pixelSize: number,
    options?: RenderOptions
  ): void;

  /**
   * 生成缩略图 base64
   */
  generateThumbnail(pixels: string[][], thumbnailPixelSize?: number): string;

  /**
   * 导出为图片 Blob
   */
  exportToImage(
    pixels: string[][],
    pixelSize: number,
    format: 'png' | 'jpg' | 'webp'
  ): Promise<Blob>;
}

interface RenderOptions {
  showGrid: boolean;
  gridColor: string;
  bgColor: string;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
}
```

**渲染算法**：
```
for each row y in pixels:
  for each col x in pixels[y]:
    color = pixels[y][x]
    if color is not transparent:
      ctx.fillStyle = color
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
```

### 2. 像素编辑器 (PixelEditor)

编辑弹框左侧的核心编辑组件。

```typescript
interface PixelEditorState {
  /** 当前工具 */
  tool: 'brush' | 'eraser' | 'eyedropper' | 'fill';
  /** 当前颜色 */
  currentColor: string;
  /** 像素数据 */
  pixels: string[][];
  /** 缩放级别 */
  zoom: number;
  /** 历史栈（撤销/重做） */
  history: string[][][];
  historyIndex: number;
}
```

**工具实现**：
- **画笔**：点击/拖拽设置像素为当前颜色
- **橡皮擦**：点击/拖拽设置像素为透明 `#00000000`
- **取色器**：点击像素获取其颜色值
- **填充**：洪水填充算法（flood fill），将连通区域填充为当前颜色

**撤销/重做**：
- 每次操作前将 pixels 深拷贝压入 history
- 最大历史记录 50 步
- Ctrl+Z 撤销，Ctrl+Y 重做

### 3. 调色板系统 (PaletteSystem)

```typescript
interface PaletteSystem {
  /** 预设调色板列表 */
  presets: Palette[];
  /** 当前活跃调色板 */
  activePalette: Palette;
  /** 自定义调色板 */
  customPalettes: Palette[];
}

interface Palette {
  name: string;
  colors: string[];  // hex RGBA 颜色列表
}
```

**预设调色板**：
- `basic`: 基础 16 色
- `gameboy`: Game Boy 4 色
- `pastel`: 柔和色
- `cyberpunk`: 赛博朋克风
- `nature`: 自然色
- `skin`: 肤色系列

**功能**：
- 切换调色板影响编辑器颜色选择
- 从当前素材提取调色板（分析 pixels 中的所有唯一颜色）
- 自定义调色板（添加/删除颜色）

### 4. 风格系统 (StyleSystem)

```typescript
interface StyleProfile {
  name: string;
  /** 像素渲染效果 */
  renderStyle: 'flat' | 'rounded' | 'outlined' | 'shadow';
  /** 颜色映射（全局色调调整） */
  colorMapping?: {
    hue: number;      // 色相偏移
    saturation: number; // 饱和度调整
    brightness: number; // 亮度调整
  };
  /** 后处理效果 */
  postProcess?: {
    outline?: { color: string; width: number };
    shadow?: { color: string; offsetX: number; offsetY: number; blur: number };
  };
}
```

**预设风格**：
- `flat`: 标准像素风格，无后处理
- `retro`: 复古风格，CRT 扫描线效果
- `outline`: 描边风格，自动为非透明像素添加轮廓
- `soft`: 柔和风格，像素边缘平滑

### 5. JSON 双向同步引擎 (SyncEngine)

编辑弹框中像素编辑器与 JSON Editor 的双向数据绑定。

```typescript
class SyncEngine {
  private pixelData: PixelAsset;
  private jsonEditor: MonacoEditor;
  private pixelCanvas: PixelEditorCanvas;
  private syncDirection: 'both' | 'pixel-to-json' | 'json-to-pixel';

  /**
   * 像素编辑器变更 → 更新 JSON Editor
   */
  onPixelChange(pixels: string[][]): void;

  /**
   * JSON Editor 变更 → 更新像素编辑器
   * 包含 JSON 语法校验
   */
  onJsonChange(jsonStr: string): void;

  /**
   * 应用变更到文件
   */
  applyChanges(): Promise<void>;
}
```

**同步策略**：
- 像素编辑器变更：实时更新 JSON（防抖 100ms）
- JSON Editor 变更：校验通过后更新像素预览（防抖 300ms）
- 冲突处理：最后修改方优先
- JSON 语法错误时：像素预览保持上一次有效状态，显示错误提示

### 6. 拖拽管理器 (DragDropManager)

```typescript
class DragDropManager {
  /**
   * 从素材栏开始拖拽
   */
  startDragFromAssetBar(asset: AssetInfo, event: DragEvent): void;

  /**
   * 画布区域接收拖拽
   */
  onCanvasDrop(event: DragEvent): CanvasItem;

  /**
   * 画布内素材移动
   */
  moveCanvasItem(item: CanvasItem, deltaX: number, deltaY: number): void;
}
```

---

## AI 集成

### DeepSeek API 接入

**模型**：仅使用 DeepSeek（`deepseek-chat` / `deepseek-reasoner`）

**API 配置**：
```typescript
interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;      // 默认: https://api.deepseek.com
  model: string;         // 默认: deepseek-chat
  maxTokens: number;     // 默认: 4096
  temperature: number;   // 默认: 0.7
}
```

### System Prompt 设计

```
你是一个像素艺术编辑助手。你可以帮助用户修改像素角色的 JSON 数据。

JSON 格式说明：
- name: 素材名称
- pixels: 二维数组，每个元素是 #RRGGBBAA 格式的颜色值
  - RR/GG/BB 是红绿蓝通道 (00-FF)
  - AA 是透明度 (00=完全透明, FF=完全不透明)

你可以：
1. 修改特定区域的像素颜色
2. 添加/删除图形元素
3. 调整整体色调
4. 生成新的像素图案
5. 优化现有的像素艺术

当用户要求修改时，你需要返回完整的修改后 JSON，确保格式正确。
```

### AI 编辑模式

| 模式 | 说明 | 交互方式 |
|------|------|----------|
| 对话模式 | 自由对话，AI 返回建议变更 | Chat 面板输入 |
| 指令模式 | 快捷指令触发编辑 | 工具栏按钮 |
| 批量模式 | AI 一次性处理多个素材 | 右键菜单 |

**快捷指令**：
- 🎨 `换色`：替换指定颜色
- 🔄 `镜像`：水平/垂直翻转
- 📏 `缩放`：放大/缩小像素图
- 🎭 `风格化`：应用特定风格
- ✨ `优化`：AI 优化像素细节
- 🧹 `清理`：移除孤立像素

### AI 变更审核流程

```
AI 返回建议变更
    ↓
显示 diff 对比（像素差异高亮）
    ↓
用户选择：[应用] [修改] [忽略]
    ↓
应用 → 写入 JSON → 更新画布
忽略 → 丢弃变更
修改 → 追加对话继续调整
```

---

## 目录结构

```
packages/character-editor/
├── spec/
│   └── design.md              # 本设计文档
├── server/                     # Node.js 后端
│   ├── index.ts               # Express 服务器入口
│   ├── routes/
│   │   ├── assets.ts          # 素材文件 CRUD 路由
│   │   ├── config.ts          # 配置管理路由
│   │   ├── export.ts          # 导出路由
│   │   └── ai.ts              # AI 对话路由
│   ├── services/
│   │   ├── file-service.ts    # 文件系统操作服务
│   │   ├── render-service.ts  # 服务端渲染服务（缩略图生成）
│   │   └── ai-service.ts      # DeepSeek API 调用服务
│   └── utils/
│       └── pixel-utils.ts     # 像素处理工具函数
├── src/                        # React 前端
│   ├── main.tsx               # 入口
│   ├── App.tsx                # 根组件
│   ├── types/
│   │   └── index.ts           # 类型定义
│   ├── stores/                # 状态管理 (zustand)
│   │   ├── asset-store.ts     # 素材状态
│   │   ├── canvas-store.ts    # 画布状态
│   │   ├── editor-store.ts    # 编辑器状态
│   │   ├── config-store.ts    # 配置状态
│   │   └── ai-store.ts        # AI 对话状态
│   ├── components/
│   │   ├── TopToolbar/
│   │   │   ├── index.tsx
│   │   │   ├── ExportDialog.tsx
│   │   │   └── PixelSizeControl.tsx
│   │   ├── AssetBar/
│   │   │   ├── index.tsx
│   │   │   ├── AssetCard.tsx
│   │   │   └── NewAssetButton.tsx
│   │   ├── CanvasArea/
│   │   │   ├── index.tsx
│   │   │   ├── CanvasRenderer.tsx
│   │   │   └── CanvasItem.tsx
│   │   ├── EditDialog/
│   │   │   ├── index.tsx
│   │   │   ├── PixelEditor.tsx
│   │   │   ├── PixelCanvas.tsx
│   │   │   ├── ToolBar.tsx
│   │   │   ├── ColorPicker.tsx
│   │   │   ├── PalettePanel.tsx
│   │   │   ├── JsonEditor.tsx
│   │   │   └── SyncIndicator.tsx
│   │   ├── SettingsPanel/
│   │   │   ├── index.tsx
│   │   │   └── FolderPathInput.tsx
│   │   ├── AIChatPanel/
│   │   │   ├── index.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── DiffViewer.tsx
│   │   │   └── QuickCommands.tsx
│   │   └── ui/                # 通用 UI 组件
│   │       ├── Button.tsx
│   │       ├── Dialog.tsx
│   │       ├── Input.tsx
│   │       ├── Slider.tsx
│   │       ├── Select.tsx
│   │       └── Tooltip.tsx
│   ├── lib/
│   │   ├── pixel-renderer.ts  # 像素渲染核心逻辑
│   │   ├── pixel-editor.ts    # 像素编辑逻辑（工具、填充等）
│   │   ├── palette.ts         # 调色板管理
│   │   ├── style-system.ts    # 风格系统
│   │   ├── sync-engine.ts     # JSON 双向同步引擎
│   │   └── drag-drop.ts       # 拖拽管理
│   ├── hooks/
│   │   ├── useCanvas.ts       # 画布交互 Hook
│   │   ├── usePixelEditor.ts  # 像素编辑 Hook
│   │   ├── useAIChat.ts       # AI 对话 Hook
│   │   └── useSyncEngine.ts   # 同步引擎 Hook
│   └── styles/
│       ├── globals.css        # 全局样式
│       └── variables.css      # CSS 变量
├── index.html                  # Vite 入口 HTML
├── vite.config.ts             # Vite 配置（含 proxy）
├── tsconfig.json
├── tsconfig.node.json
├── package.json
└── README.md
```

---

## 依赖清单

### 前端依赖

| 包名 | 用途 | 版本 |
|------|------|------|
| react | UI 框架 | ^18.2.0 |
| react-dom | React DOM | ^18.2.0 |
| zustand | 状态管理 | ^4.5.0 |
| @monaco-editor/react | JSON 编辑器 | ^4.6.0 |
| react-dnd | 拖拽功能 | ^16.0.0 |
| react-dnd-html5-backend | DnD HTML5 后端 | ^16.0.0 |
| uuid | ID 生成 | ^9.0.0 |

### 前端开发依赖

| 包名 | 用途 | 版本 |
|------|------|------|
| typescript | 类型系统 | ^5.3.0 |
| vite | 构建工具 | ^5.0.0 |
| @vitejs/plugin-react | React Vite 插件 | ^4.2.0 |
| @types/react | React 类型 | ^18.2.0 |
| @types/react-dom | React DOM 类型 | ^18.2.0 |
| @types/uuid | UUID 类型 | ^9.0.0 |

### 后端依赖

| 包名 | 用途 | 版本 |
|------|------|------|
| express | HTTP 服务器 | ^4.18.0 |
| cors | 跨域 | ^2.8.5 |
| chalk | 终端彩色输出 | ^5.3.0 |
| uuid | ID 生成 | ^9.0.0 |

### 后端开发依赖

| 包名 | 用途 | 版本 |
|------|------|------|
| tsx | TypeScript 执行 | ^4.7.0 |
| @types/express | Express 类型 | ^4.17.0 |
| @types/cors | CORS 类型 | ^2.8.0 |
| typescript | 类型系统 | ^5.3.0 |

---

## 关键交互流程

### 流程1：素材浏览与拖拽

```
1. 启动应用 → 读取配置文件夹路径
2. 调用 GET /api/assets → 扫描文件夹
3. 渲染素材栏列表（每项含缩略图）
4. 用户拖拽素材到画布
5. 画布 drop 事件 → 创建 CanvasItem
6. PixelRenderer 渲染到画布 Canvas
```

### 流程2：像素编辑

```
1. 点击素材编辑按钮 → 打开 EditDialog
2. 加载 PixelAsset JSON
3. 左侧 PixelCanvas 渲染像素
4. 右侧 Monaco Editor 显示 JSON
5. 用户在 PixelCanvas 上操作：
   a. 选择工具（画笔/橡皮/取色/填充）
   b. 点击/拖拽修改像素
   c. SyncEngine 实时更新右侧 JSON
6. 用户在 JSON Editor 修改：
   a. 输入 JSON 文本
   b. 校验 JSON 语法
   c. 校验数据结构（pixels 格式）
   d. 通过后 SyncEngine 更新左侧像素预览
7. 点击保存 → PUT /api/asset → 写入文件
```

### 流程3：AI 编辑

```
1. 点击 AI 助手按钮 → 打开 AIChatPanel
2. 自动附加当前编辑的素材作为上下文
3. 用户输入指令（如 "把帽子改成蓝色"）
4. POST /api/ai/chat（SSE 流式）
5. 后端构造 system prompt + 用户消息 + 素材 JSON
6. 调用 DeepSeek API → 流式返回
7. 前端实时显示 AI 回复
8. AI 返回 suggestedChange（修改后的 JSON）
9. 显示 DiffViewer（像素差异高亮）
10. 用户选择 [应用] → 写入 JSON → 更新画布
11. 用户选择 [忽略] → 丢弃变更
```

### 流程4：导出图片

```
1. 点击导出按钮 → 打开 ExportDialog
2. 选择格式（PNG/JPG/WebP）、像素大小、背景色
3. 前端 PixelRenderer.exportToImage() 生成图片
4. 下载到本地
```

---

## Vite 配置要点

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3004,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
  },
});
```

后端 Express 服务运行在 `3005` 端口，前端 Vite 开发服务器运行在 `3004` 端口，通过 proxy 转发 API 请求。

---

## 启动脚本

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "vite",
    "dev:server": "tsx watch server/index.ts",
    "build": "vite build && tsc -p server/tsconfig.json",
    "preview": "vite preview"
  }
}
```

使用 `concurrently` 同时启动前后端开发服务器。
