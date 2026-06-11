# Character Editor 设计文档

## 概述

一个像素角色编辑器，**核心场景是：先制作小的像素部件（头、身体、手臂、腿等），然后将部件组合拼装成完整人物角色**。因此，**部件之间的尺寸一致性是本工具的首要设计约束**——所有尺寸信息必须在界面中醒目标注，让人一眼看出部件大小、快速发现尺寸不匹配，并能便捷调整。

核心功能：
- 读写 JSON 文件，预览 JSON 为像素图
- **重点标注尺寸信息**（像素宽×高），支持按尺寸筛选/分组部件
- **尺寸对齐辅助**：网格吸附、锚点对齐、尺寸不一致告警
- 调整像素颗粒、颜色、调色板、整体风格
- 接入 DeepSeek AI 对 JSON 进行智能编辑
- 多选部件 → 组合预览 → 批量 AI 修改

技术栈：React + Vite + TypeScript + Node.js

---

## 目录

1. [系统架构](#系统架构)
2. [数据模型](#数据模型)
3. [API 设计](#api-设计)
4. [UI 结构与交互](#ui-结构与交互)
5. [核心模块设计](#核心模块设计)
6. [功能场景模块](#功能场景模块)
7. [AI 集成](#ai-集成)
8. [目录结构](#目录结构)
9. [依赖清单](#依赖清单)

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
    // ===== 部件组合相关字段（核心） =====
    /** 部件类型：用于标识此素材在角色中的位置 */
    partType?: PartType;
    /** 尺寸分类：相同 sizeClass 的部件宽度一致，便于拼装对齐 */
    sizeClass?: string;  // 例: "16w", "32w", "8w"
    /** 锚点偏移：部件在组合时的参考点，相对于像素左上角的偏移(px) */
    anchor?: { x: number; y: number };
    /** 图层顺序：组合时从后到前的渲染层级，数字越大越靠前 */
    layer?: number;  // 默认: 0
    /** 连接点：部件与其他部件的连接位置 */
    joints?: Joint[];
  };
}

/** 部件类型枚举 */
type PartType =
  | 'head'       // 头部
  | 'body'       // 身体/躯干
  | 'arm-left'   // 左臂
  | 'arm-right'  // 右臂
  | 'leg-left'   // 左腿
  | 'leg-right'  // 右腿
  | 'hat'        // 帽子/头饰
  | 'weapon'     // 武器
  | 'shield'     // 盾牌
  | 'accessory'  // 配饰（披风、项链等）
  | 'custom';    // 自定义

/** 连接点：定义部件之间的拼装关系 */
interface Joint {
  /** 连接点名称 */
  name: string;       // 例: "neck", "shoulder-left", "hip-left"
  /** 连接点在部件像素坐标系中的位置 */
  x: number;
  y: number;
  /** 连接方向：此连接点朝向 */
  direction?: 'up' | 'down' | 'left' | 'right';
}
```

**pixels 颜色格式说明**：
- 格式：`#RRGGBBAA`（8位 hex，带透明度）
- 例：`#FF0000FF` = 红色不透明，`#00000000` = 完全透明
- 空像素使用 `#00000000` 表示

**尺寸一致性说明（重要）**：
- `sizeClass` 是部件组合的核心字段，标识部件的宽度分类（如 `"16w"` = 宽16像素）
- 同一角色的同排部件（如左臂/身体/右臂）**必须**具有相同的 `sizeClass`，否则拼装时会对不齐
- `anchor` 定义部件拼装时的参考点，两个部件的锚点对齐即为拼装位置
- `joints` 定义精确的连接关系（如头的 `neck` 连接点对齐身体的 `neck-top` 连接点）
- `layer` 控制渲染顺序，确保正确遮挡（如手臂在身体前面，披风在身体后面）

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

### Scene（功能场景）

场景是多个素材的组合视图，支持多选素材在同一个预览中展示，并可对选中素材进行批量 AI 对话修改。

```typescript
interface Scene {
  /** 场景唯一ID */
  id: string;
  /** 场景名称 */
  name: string;
  /** 场景中的素材列表 */
  assets: SceneAsset[];
  /** 场景画布配置 */
  canvasConfig: {
    width: number;       // 画布宽度 (px)
    height: number;      // 画布高度 (px)
    bgColor: string;     // 背景色
    pixelSize: number;   // 像素颗粒大小
  };
  /** 当前选中的素材ID列表（用于批量操作） */
  selectedAssetIds: string[];
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

interface SceneAsset {
  /** 场景内的素材实例ID */
  id: string;
  /** 对应的素材文件路径 */
  assetPath: string;
  /** 素材在场景画布中的位置 */
  x: number;
  y: number;
  /** 缩放比例 */
  scale: number;
  /** 是否被选中 */
  selected: boolean;
  /** 素材数据快照 */
  pixelData: PixelAsset;
}
```

### BatchAIContext（批量 AI 上下文）

批量 AI 对话时，自动构建多素材上下文。

```typescript
interface BatchAIContext {
  /** 涉及的素材列表 */
  assets: {
    path: string;
    name: string;
    width: number;
    height: number;
    pixelData: PixelAsset;
  }[];
  /** 用户选中的素材路径（AI 重点关注） */
  selectedPaths: string[];
  /** 场景名称 */
  sceneName: string;
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

### 场景 API

#### `GET /api/scenes`
获取所有场景列表。

**Response:**
```json
{
  "scenes": [
    {
      "id": "scene-001",
      "name": "角色编队",
      "assetCount": 4,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `GET /api/scene/:id`
获取场景详情（含所有素材数据）。

**Response:** `Scene` JSON

#### `POST /api/scene`
创建新场景。

**Body:**
```json
{
  "name": "角色编队",
  "canvasConfig": {
    "width": 512,
    "height": 512,
    "bgColor": "#222222",
    "pixelSize": 16
  }
}
```

#### `PUT /api/scene/:id`
更新场景（添加/移除素材、调整位置等）。

**Body:**
```json
{
  "name": "新名称",
  "assets": [
    { "assetPath": "/data/characters/warrior.json", "x": 0, "y": 0, "scale": 1 }
  ],
  "canvasConfig": { "pixelSize": 8 }
}
```

#### `DELETE /api/scene/:id`
删除场景。

#### `POST /api/scene/:id/assets`
向场景添加素材。

**Body:**
```json
{
  "assetPath": "/data/characters/mage.json",
  "x": 100,
  "y": 50,
  "scale": 1
}
```

#### `DELETE /api/scene/:id/assets/:assetId`
从场景中移除素材。

#### `POST /api/scene/:id/select`
设置场景中选中的素材（用于批量操作）。

**Body:**
```json
{
  "selectedAssetIds": ["asset-1", "asset-3"]
}
```

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
| 场景模式 | Toggle Button | 切换到场景编辑模式，支持多素材预览与批量操作 |
| 设置 | Button | 打开设置面板 |
| AI 助手 | Button | 打开/关闭 AI Chat 侧边栏 |

### 2. 左侧素材栏 (AssetBar)

宽度固定 120px，可滚动列表。**尺寸信息全程醒目标注**。

#### 尺寸筛选栏（顶部固定）

```
┌──────────────┐
│ 尺寸筛选:     │
│ [8x8] [16x16]│  ← 按尺寸分类 tab，快速筛选
│ [32x32] [全部]│
│ ⚠ 2个尺寸异常 │  ← 尺寸不一致的部件数
└──────────────┘
```

- 按尺寸分组 tab：自动扫描所有素材，按像素尺寸归类（如 8x8、16x16、32x32）
- 点击 tab 过滤只显示该尺寸的部件
- "⚠ 尺寸异常"：标识 `sizeClass` 不匹配实际像素宽度的部件

#### 部件卡片（每个素材）

```
┌──────────────┐
│   预览图      │  ← Canvas 渲染的缩略图
│   (64x64)    │
├──────────────┤
│ name         │  ← 素材名称
│ ┌──────────┐ │
│ │ 16×16    │ │  ← 🔴 尺寸标签（醒目红色/黄色背景）
│ │ sizeClass│ │     正常=绿色, 异常=黄色, 不匹配=红色
│ │  16w     │ │  ← sizeClass 标识
│ └──────────┘ │
│ 🏷️ head  L:1 │  ← 部件类型 + 图层号
│ [编辑]       │
└──────────────┘
```

**尺寸标签颜色规则**：
| 状态 | 颜色 | 条件 |
|------|------|------|
| ✅ 正常 | 绿色 `#22C55E` | sizeClass 与实际像素宽度一致 |
| ⚠️ 缺失 | 黄色 `#EAB308` | 未设置 sizeClass |
| ❌ 不匹配 | 红色 `#EF4444` | sizeClass 与实际像素宽度不一致 |

底部有 `[+新建]` 按钮，创建空白像素素材（可选择预设尺寸 8x8/16x16/32x32）。

**交互**：
- 可拖拽素材到画布区域（drag & drop）
- 点击编辑按钮打开编辑弹框
- 右键菜单：重命名、删除、复制、**调整尺寸**、**设置sizeClass**
- **双击尺寸标签** → 快速编辑 sizeClass / partType / layer

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

## 功能场景模块

功能场景模块是多素材组合预览与批量 AI 编辑的核心模块。用户可以创建"场景"，将多个素材放入同一画布中预览，并通过多选素材进行批量 AI 对话修改。

### 设计目标

1. **多素材同屏预览**：将多个像素素材放置在同一个画布中，直观查看组合效果
2. **多选与批量操作**：支持点选/框选多个素材，一键对选中素材执行相同编辑操作
3. **批量 AI 对话**：在场景中对多选素材发起 AI 对话，AI 同时理解并修改多个素材
4. **场景持久化**：场景配置（素材位置、画布设置等）可保存和恢复

### 场景编辑器 (SceneEditor)

场景编辑器是功能场景的核心 UI 组件，替代普通画布区域成为场景模式的主界面。

```
┌──────────────────────────────────────────────────────┐
│  场景: 角色编队    [保存] [导出场景] [全选] [AI批量💬] │
├──────────────────────────────────────────────────────┤
│                                                      │
│    ┌──────┐   ┌──────┐                               │
│    │warrior│   │ mage │                               │
│    │  ☑   │   │  ☑   │     ← 选中状态，蓝色边框高亮    │
│    └──────┘   └──────┘                               │
│                                                      │
│         ┌──────┐   ┌──────┐                          │
│         │ archer│  │ healer│                          │
│         │  ☐   │   │  ☐   │   ← 未选中               │
│         └──────┘   └──────┘                          │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 选中: 2 个素材 | [批量换色] [批量镜像] [批量AI编辑] │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 尺寸对齐辅助系统（核心）

部件组合的首要问题是尺寸一致性。场景编辑器内置多层级对齐辅助：

#### 尺寸标注（始终可见）

每个场景中的素材，其边框外侧**始终显示尺寸标签**：

```
   16×8          ← 素材上方显示像素尺寸
 ┌──────┐
 │      │
 │ head │
 │      │
 └──────┘
   16w            ← 素材下方显示 sizeClass
```

- 尺寸标签字体：10px，白色，黑色半透明背景
- 尺寸不匹配时标签变红并闪烁

#### 网格吸附

- 场景画布按 `pixelSize` 显示像素级网格
- 拖拽素材时自动吸附到网格点（1px 精度）
- 吸附规则：素材位置 snap 到最近的 `pixelSize` 整数倍

#### 锚点对齐

- 素材的 `anchor` 点以 🔴 红色圆点标注
- 拖拽素材靠近另一个素材的锚点时：
  - 自动高亮两锚点间的磁吸线
  - 松手自动吸附对齐
- 快捷键：按住 Alt 拖拽 = 临时关闭吸附

#### 连接点对齐

- 素材的 `joints` 以蓝色菱形标注
- 两个素材的连接点名称匹配时（如 "neck" ↔ "neck-top"）：
  - 显示连接引导线（虚线）
  - 拖拽时自动吸附对齐

#### 尺寸一致性告警

场景中存在尺寸不匹配时，画布右上角显示告警面板：

```
┌─────────────────────────────────┐
│ ⚠️ 尺寸不一致告警               │
├─────────────────────────────────┤
│ ❌ head (16w) vs body (32w)     │  ← 宽度不匹配
│ ⚠️ arm-left 缺少 sizeClass      │  ← 未设置
│ 💡 建议: 将 head 扩展为 32px 宽  │  ← AI 建议
├─────────────────────────────────┤
│ [自动修复] [忽略] [🤖 AI调整]   │
└─────────────────────────────────┘
```

**告警规则**：
| 条件 | 级别 | 图标 |
|------|------|------|
| sizeClass 不匹配实际宽度 | ❌ 错误 | 红色 |
| 缺少 sizeClass | ⚠️ 警告 | 黄色 |
| 缺少 partType | ⚠️ 警告 | 黄色 |
| 缺少 anchor | 💡 提示 | 蓝色 |
| 同排部件宽度不一致 | ❌ 错误 | 红色闪烁 |

**自动修复**：点击 "自动修复" 可自动设置 sizeClass 为实际宽度值

### 场景进入方式

| 入口 | 操作 | 说明 |
|------|------|------|
| 顶部操作栏 | 点击 [场景模式] 按钮 | 从普通画布切换到场景模式 |
| 素材栏 | Ctrl/Cmd + 点击多个素材 | 自动创建临时场景并添加素材 |
| 右键菜单 | 选中素材 → "添加到场景" | 将素材添加到已有场景 |

### 多选交互

**点选**：
- 点击素材 → 选中/取消选中单个素材
- Ctrl/Cmd + 点击 → 追加到选中集合
- Shift + 点击 → 选中两次点击之间的所有素材（按添加顺序）

**框选**：
- 在画布空白区域拖拽 → 绘制选择框
- 释放时，与选择框相交的素材全部选中

**全选/取消**：
- 快捷键 Ctrl/Cmd + A → 全选场景中所有素材
- 点击画布空白区域 → 取消所有选中
- 顶部 [全选] 按钮

**选中状态视觉反馈**：
- 选中素材：蓝色虚线边框 + 四角控制点
- 未选中素材：灰色细边框
- 多选时底部浮现批量操作栏

### 批量操作栏 (BatchActionBar)

当场景中有素材被选中时，底部浮现批量操作栏。

```
┌───────────────────────────────────────────────────────────┐
│  ✓ 已选 3 个素材                                          │
│  [🎨换色] [🔄镜像] [📏缩放] [🎭风格化] [✨优化] [🧹清理]   │
│  [🤖AI批量编辑...]  [移除选中]  [取消选择]                  │
└───────────────────────────────────────────────────────────┘
```

| 按钮 | 功能 | 说明 |
|------|------|------|
| 🎨 换色 | 批量替换颜色 | 对所有选中素材执行颜色替换 |
| 🔄 镜像 | 批量翻转 | 对所有选中素材执行水平/垂直翻转 |
| 📏 缩放 | 批量缩放 | 调整选中素材在场景中的显示大小 |
| 🎭 风格化 | 批量风格化 | 对所有选中素材应用同一风格 |
| ✨ 优化 | 批量优化 | AI 优化所有选中素材 |
| 🧹 清理 | 批量清理 | 清理所有选中素材的孤立像素 |
| 🤖 AI批量编辑 | 打开批量AI对话 | 对选中素材发起 AI 对话 |
| 移除选中 | 从场景移除 | 将选中素材从场景中移除 |
| 取消选择 | 取消选中 | 清空选中状态 |

### 批量 AI 对话模式

在场景中选中多个素材后，点击 [🤖 AI批量编辑] 打开 AI Chat 面板的批量模式。

**与单素材 AI 对话的区别**：

| 特性 | 单素材对话 | 批量对话 |
|------|-----------|----------|
| 上下文 | 单个素材 JSON | 多个素材 JSON + 选中标记 |
| AI 输出 | 单个 `<<<PIXEL_CHANGE>>>` | 多个 `<<<PIXEL_CHANGE file="...">>>` |
| Diff 展示 | 单个素材 diff | 多素材 tab 切换 diff |
| 应用方式 | 应用/忽略单个变更 | 逐个审核或批量应用全部 |

**批量 AI 对话界面**：

```
┌──────────────────────┐
│  AI 批量助手         │
│  场景: 角色编队      │
│  已选: warrior, mage │
├──────────────────────┤
│                      │
│  🤖 我会对选中的      │
│  warrior 和 mage     │
│  同时执行修改。       │
│  请告诉我你要什么     │
│  效果？              │
│                      │
│  👤 给他们都加上      │
│  蓝色披风            │
│                      │
│  🤖 好的，已为两个    │
│  角色添加蓝色披风。   │
│                      │
│  📄 warrior.json     │
│  [预览变更] [应用] [忽略]│
│                      │
│  📄 mage.json        │
│  [预览变更] [应用] [忽略]│
│                      │
│  [全部应用] [全部忽略] │
├──────────────────────┤
│  [输入消息...]  [发送]│
└──────────────────────┘
```

### 场景状态管理 (SceneStore)

```typescript
interface SceneStore {
  /** 场景列表 */
  scenes: Scene[];
  /** 当前活跃场景 */
  activeScene: Scene | null;
  /** 是否处于场景模式 */
  isSceneMode: boolean;

  // Actions
  /** 创建场景 */
  createScene(name: string, config?: Partial<Scene['canvasConfig']>): Scene;
  /** 删除场景 */
  deleteScene(sceneId: string): void;
  /** 切换到场景模式 */
  enterSceneMode(sceneId: string): void;
  /** 退出场景模式 */
  exitSceneMode(): void;
  /** 向场景添加素材 */
  addAssetToScene(sceneId: string, assetPath: string, x: number, y: number): void;
  /** 从场景移除素材 */
  removeAssetFromScene(sceneId: string, sceneAssetId: string): void;
  /** 移动场景中的素材 */
  moveSceneAsset(sceneId: string, sceneAssetId: string, x: number, y: number): void;
  /** 选中/取消选中素材 */
  toggleSelectAsset(sceneId: string, sceneAssetId: string, multi?: boolean): void;
  /** 框选素材 */
  boxSelectAssets(sceneId: string, rect: { x1: number; y1: number; x2: number; y2: number }): void;
  /** 全选 */
  selectAll(sceneId: string): void;
  /** 取消全选 */
  clearSelection(sceneId: string): void;
  /** 获取当前选中的素材 */
  getSelectedAssets(): SceneAsset[];
  /** 保存场景 */
  saveScene(sceneId: string): Promise<void>;
}
```

### 场景渲染器 (SceneRenderer)

扩展 PixelRenderer，支持在同一 Canvas 中渲染多个素材。

```typescript
class SceneRenderer extends PixelRenderer {
  /**
   * 渲染整个场景
   */
  renderScene(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    options?: RenderOptions
  ): void;

  /**
   * 渲染单个场景素材
   */
  renderSceneAsset(
    ctx: CanvasRenderingContext2D,
    asset: SceneAsset,
    pixelSize: number,
    isSelected?: boolean
  ): void;

  /**
   * 绘制选择框
   */
  drawSelectionBox(
    ctx: CanvasRenderingContext2D,
    assets: SceneAsset[]
  ): void;

  /**
   * 绘制框选区域
   */
  drawDragSelectRect(
    ctx: CanvasRenderingContext2D,
    rect: { x1: number; y1: number; x2: number; y2: number }
  ): void;
}
```

**场景渲染流程**：
```
1. 清空画布，填充背景色
2. 按添加顺序遍历 scene.assets
3. 对每个 SceneAsset：
   a. 保存 ctx 状态
   b. 平移到 (asset.x, asset.y)
   c. 按 asset.scale 缩放
   d. 调用 render(ctx, asset.pixelData.pixels, pixelSize)
   e. 如果 asset.selected，绘制选中边框
   f. 恢复 ctx 状态
4. 如果正在框选，绘制选择框矩形
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

系统提示词按场景分为以下几类，后端 `ai-service.ts` 根据请求类型自动拼接对应 prompt。

---

#### 1. 基础系统提示词 (Base System Prompt)

所有模式共用，定义角色身份、JSON 格式规范和基本约束。

```markdown
你是 PixelCraft，一个专业的像素艺术编辑助手。你的任务是帮助用户创建和修改像素角色的 JSON 数据。

## JSON 数据格式

你操作的 JSON 数据格式如下：

{
  "name": "素材名称",
  "pixels": [
    ["#RRGGBBAA", "#RRGGBBAA", ...],  // 第 0 行
    ["#RRGGBBAA", "#RRGGBBAA", ...],  // 第 1 行
    ...
  ],
  "meta": {
    "author": "作者",
    "description": "描述",
    "tags": ["标签"],
    "palette": ["#RRGGBBAA", ...],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}

### 颜色格式规范
- 格式：#RRGGBBAA（8位十六进制，带透明度）
- RR = 红色通道 (00-FF)
- GG = 绿色通道 (00-FF)
- BB = 蓝色通道 (00-FF)
- AA = 透明度通道 (00=完全透明, FF=完全不透明)
- 透明像素必须使用 "#00000000"
- 所有颜色值必须以 # 开头，8位十六进制

### 像素坐标系
- pixels[y][x]：y 为行号（从上到下），x 为列号（从左到右）
- 左上角为 (0, 0)
- 常见尺寸：8x8, 16x16, 32x32, 64x64

## 基本规则
1. 修改像素时，必须返回完整的修改后 JSON，不能只返回变更部分
2. 保持 pixels 数组的行列结构不变，除非用户明确要求调整尺寸
3. 不改变用户未要求修改的像素颜色
4. 确保所有颜色值格式正确（#RRGGBBAA）
5. 如果用户的指令不明确，先询问确认再进行修改
```

---

#### 2. 对话模式提示词 (Chat Mode Prompt)

用于 AI Chat 面板的自由对话场景，附加在基础提示词之后。

```markdown
## 当前对话模式：自由对话

你正在与用户进行像素艺术的对话式编辑。用户可能会用自然语言描述他们想要的修改。

### 交互指南
- 用中文回复
- 先理解用户意图，再进行修改
- 对于模糊的指令（如"改好看一点"），给出你的理解和具体方案，征得用户同意后再修改
- 如果涉及区域修改（如"帽子"），需要根据像素图推断该区域的位置范围
- 修改完成后，简要说明你做了什么改动

### 回复格式
当你需要修改像素数据时，在回复的最后用以下格式输出变更：

<<<PIXEL_CHANGE>>>
{完整的修改后 PixelAsset JSON}
<<<END_CHANGE>>>

如果没有修改像素数据，正常回复即可，不需要包含 <<<PIXEL_CHANGE>>> 标记。

### 常见指令理解
- "把X改成Y色" → 替换指定区域或指定颜色的像素
- "加一个X" → 在合适位置绘制新图形
- "去掉X" → 将对应区域设为透明
- "翻转" → 水平或垂直镜像像素数组
- "换色" → 全局替换某种颜色
- "风格化" → 应用特定的色调或渲染风格
```

---

#### 3. 指令编辑模式提示词 (Edit Mode Prompt)

用于快捷指令和直接编辑场景，强调精确执行。

```markdown
## 当前对话模式：指令编辑

用户通过精确的编辑指令修改像素数据。你需要严格按照指令执行，不做额外修改。

### 执行规则
1. 严格按照指令操作，不自行发挥
2. 只修改指令涉及的区域或颜色
3. 保持其他像素完全不变
4. 必须返回完整的修改后 JSON

### 回复格式
直接输出修改结果，格式如下：

<<<PIXEL_CHANGE>>>
{完整的修改后 PixelAsset JSON}
<<<END_CHANGE>>>

说明：{一句话描述你做了什么修改}

### 支持的指令类型
- replace_color: 替换颜色 → 将所有 #SRC 替换为 #DST
- fill_region: 区域填充 → 将指定矩形区域填充为指定颜色
- mirror_horizontal: 水平翻转 → 沿垂直中轴线翻转
- mirror_vertical: 垂直翻转 → 沿水平中轴线翻转
- shift: 平移 → 将所有非透明像素向指定方向偏移
- resize: 调整尺寸 → 放大或缩小像素图
- rotate: 旋转 → 90/180/270度旋转
- clear_region: 清除区域 → 将指定区域设为透明
- outline: 描边 → 为非透明像素添加1px轮廓
- invert: 反色 → 所有非透明像素取反色
```

---

#### 4. 批量处理提示词 (Batch Mode Prompt)

用于同时处理多个素材文件的场景。

```markdown
## 当前对话模式：批量处理

用户需要对多个素材进行统一的修改操作。你需要对每个素材分别处理并返回结果。

### 执行规则
1. 对每个素材独立执行相同的修改逻辑
2. 保持每个素材的原始尺寸和结构
3. 分别返回每个素材的修改结果

### 回复格式
对每个素材输出一个变更块：

<<<PIXEL_CHANGE file="文件路径1">>>
{完整的修改后 PixelAsset JSON}
<<<END_CHANGE>>>

<<<PIXEL_CHANGE file="文件路径2">>>
{完整的修改后 PixelAsset JSON}
<<<END_CHANGE>>>

说明：
- 文件1: {修改说明}
- 文件2: {修改说明}
```

---

#### 5. 上下文注入模板 (Context Injection)

在发送给 DeepSeek API 时，系统会自动将当前素材数据注入到对话上下文中。

**素材上下文格式**：

```markdown
## 当前素材数据

文件名: {assetName}
文件路径: {assetPath}
尺寸: {width}x{height}
使用的颜色: {提取的唯一颜色列表}

```json
{完整的 PixelAsset JSON}
```
```

**注入位置**：放在 system prompt 之后、用户消息之前，role 为 `system`。

**批量素材上下文格式**（用于场景模式多选素材）：

```markdown
## 当前场景数据

场景名称: {sceneName}
场景中共有 {total} 个素材，用户选中了 {selected} 个进行编辑。

### 选中的素材（需要修改）

--- 素材 1 ---
文件名: {assetName1}
文件路径: {assetPath1}
尺寸: {width1}x{height1}
使用的颜色: {提取的唯一颜色列表1}

```json
{完整的 PixelAsset JSON 1}
```

--- 素材 2 ---
文件名: {assetName2}
文件路径: {assetPath2}
尺寸: {width2}x{height2}
使用的颜色: {提取的唯一颜色列表2}

```json
{完整的 PixelAsset JSON 2}
```

### 场景中的其他素材（仅供参考，不需要修改）

- {assetName3}: {assetPath3}, {width3}x{height3}
- {assetName4}: {assetPath4}, {width4}x{height4}
```

---

#### 6. 快捷指令映射表

| 快捷指令 | 注入的用户消息 | 模式 |
|----------|---------------|------|
| 🎨 换色 | "请将素材中所有 {选中的颜色} 替换为 {目标颜色}" | edit |
| 🔄 水平镜像 | "请将素材水平翻转（沿垂直中轴线镜像）" | edit |
| 🔄 垂直镜像 | "请将素材垂直翻转（沿水平中轴线镜像）" | edit |
| 📏 放大2x | "请将素材放大2倍，每个像素扩展为2x2" | edit |
| 📏 缩小50% | "请将素材缩小50%，每2x2像素取左上角颜色" | edit |
| 🎭 风格化-复古 | "请将素材转换为复古色调风格：降低饱和度、增加暖色偏移、添加轻微噪点感" | chat |
| 🎭 风格化-赛博 | "请将素材转换为赛博朋克风格：提高对比度、增加霓虹色（青色#00FFFFFF和品红#FF00FFFF）" | chat |
| ✨ 优化 | "请优化素材的像素细节：平滑锯齿、优化轮廓、统一相近颜色，但保持整体造型不变" | chat |
| 🧹 清理 | "请清理素材中的孤立像素（周围8格没有相同颜色的单像素点设为透明）" | edit |
| 🔄 旋转90° | "请将素材顺时针旋转90度" | edit |
| 🔲 描边 | "请为素材中所有非透明像素添加1px的黑色描边轮廓" | edit |
| 🔃 反色 | "请将素材中所有非透明像素取反色（RGB各通道取补）" | edit |

---

#### 7. 完整 Prompt 拼接示例

一次 AI Chat 请求的消息序列示例：

```json
[
  {
    "role": "system",
    "content": "<基础系统提示词>"
  },
  {
    "role": "system",
    "content": "<对话模式提示词>"
  },
  {
    "role": "system",
    "content": "<素材上下文：文件名warrior, 完整JSON数据>"
  },
  {
    "role": "user",
    "content": "把角色的帽子改成蓝色"
  }
]
```

快捷指令请求的消息序列示例：

```json
[
  {
    "role": "system",
    "content": "<基础系统提示词>"
  },
  {
    "role": "system",
    "content": "<指令编辑模式提示词>"
  },
  {
    "role": "system",
    "content": "<素材上下文：文件名warrior, 完整JSON数据>"
  },
  {
    "role": "user",
    "content": "请将素材水平翻转（沿垂直中轴线镜像）"
  }
]
```

场景批量 AI 对话请求的消息序列示例：

```json
[
  {
    "role": "system",
    "content": "<基础系统提示词>"
  },
  {
    "role": "system",
    "content": "<批量处理提示词>"
  },
  {
    "role": "system",
    "content": "<批量素材上下文：场景名角色编队, warrior+mage 选中, 含完整JSON数据>"
  },
  {
    "role": "user",
    "content": "给他们都加上蓝色披风"
  }
]
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
│   │   ├── scenes.ts          # 场景 CRUD 路由
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
│   │   ├── scene-store.ts     # 场景状态（多选、批量操作）
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
│   │   ├── SceneEditor/
│   │   │   ├── index.tsx          # 场景编辑器主组件
│   │   │   ├── SceneCanvas.tsx    # 场景画布（多素材渲染）
│   │   │   ├── SceneAsset.tsx     # 场景中的单个素材
│   │   │   ├── BatchActionBar.tsx # 批量操作栏
│   │   │   └── SceneList.tsx      # 场景列表选择
│   │   ├── AIChatPanel/
│   │   │   ├── index.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── DiffViewer.tsx
│   │   │   ├── BatchDiffViewer.tsx # 批量 diff 查看器
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
│   │   ├── useScene.ts        # 场景交互 Hook（多选、框选、批量操作）
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

### 流程5：场景多选与批量 AI 编辑

```
1. 点击顶部 [场景模式] 按钮 → 进入场景模式
2. POST /api/scene → 创建新场景（或选择已有场景）
3. 从素材栏拖拽多个素材到场景画布
4. POST /api/scene/:id/assets → 逐个添加素材
5. SceneRenderer 渲染场景中所有素材
6. 用户点选/框选多个素材：
   a. 点击选中单个，Ctrl+点击追加，拖拽框选多个
   b. 选中素材显示蓝色虚线边框
   c. 底部浮现 BatchActionBar
7. 用户点击 [🤖 AI批量编辑] → 打开 AIChatPanel 批量模式
8. 前端构建 BatchAIContext（选中素材 JSON + 场景信息）
9. 用户输入指令（如 "给他们都加上蓝色披风"）
10. POST /api/ai/chat（mode=batch, SSE 流式）
11. 后端拼接 <基础提示词> + <批量处理提示词> + <批量素材上下文>
12. 调用 DeepSeek API → 流式返回
13. 前端解析多个 <<<PIXEL_CHANGE file="...">>> 块
14. 显示多素材 diff 列表，每个素材一个 [预览变更] [应用] [忽略]
15. 用户逐个审核或点击 [全部应用]
16. 应用变更 → 批量 PUT /api/asset → 写入各素材文件
17. 场景画布自动刷新渲染
```

### 流程6：部件组合为角色（核心流程）

```
1. 创建各部件素材（头/身体/左臂/右臂/左腿/右腿...）
   → 每个部件设置 meta.partType, meta.sizeClass, meta.anchor, meta.joints
   → 素材栏自动按尺寸分组，尺寸异常的部件高亮告警

2. 进入场景模式 → 创建新场景 "角色组合"
   → 场景自动设置 pixelSize 与部件 sizeClass 对应

3. 拖入所有部件到场景画布
   → 尺寸一致性校验自动触发：
     a. 同排部件 sizeClass 是否一致？❌ → 告警
     b. 部件 sizeClass 与实际像素宽度是否一致？⚠️ → 告警
     c. 所有部件是否设置了 partType？⚠️ → 告警

4. 查看告警面板 → 修复尺寸问题
   → [自动修复]：自动设置 sizeClass 为实际宽度
   → [🤖 AI调整]：AI 自动缩放部件到统一宽度
   → 手动调整：双击尺寸标签 → 修改 sizeClass / 调整像素尺寸

5. 拖拽部件进行拼装
   → 锚点/连接点自动吸附对齐：
     a. head.joints[neck] 对齐 body.joints[neck-top] → 自动吸附
     b. arm-left.joints[shoulder] 对齐 body.joints[shoulder-left]
     c. leg-left.joints[hip] 对齐 body.joints[hip-left]
   → 网格吸附确保像素级对齐
   → 每个部件上方/下方显示尺寸标签（16×8 / 16w）

6. 调整图层顺序
   → 按 layer 排序：披风(L:0) < 身体(L:1) < 手臂(L:2) < 头(L:3) < 帽子(L:4)
   → 选中部件 → 右键 → 图层上移/下移

7. 检查组合效果 → 满意后保存场景

8. 导出完整角色
   → [导出场景] → 合并所有部件为单张 PNG
   → 或通过 AI 批量微调："所有部件色调统一偏暖"
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
