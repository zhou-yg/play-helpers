/** 部件类型枚举 */
export type PartType =
  | 'head'
  | 'body'
  | 'arm-left'
  | 'arm-right'
  | 'leg-left'
  | 'leg-right'
  | 'hat'
  | 'weapon'
  | 'shield'
  | 'accessory'
  | 'custom';

/** 连接点：定义部件之间的拼装关系 */
export interface Joint {
  /** 连接点名称 */
  name: string;
  /** 连接点在部件像素坐标系中的位置 */
  x: number;
  y: number;
  /** 连接方向 */
  direction?: 'up' | 'down' | 'left' | 'right';
}

/** 像素素材 JSON 文件格式 */
export interface PixelAsset {
  /** 素材名称 */
  name: string;
  /** 像素数据：二维数组，每个元素是 hex RGBA 颜色值 */
  pixels: string[][];
  /** 元数据（可选） */
  meta?: {
    author?: string;
    description?: string;
    tags?: string[];
    palette?: string[];
    createdAt?: string;
    updatedAt?: string;
    /** 部件类型 */
    partType?: PartType;
    /** 尺寸分类 */
    sizeClass?: string;
    /** 锚点偏移 */
    anchor?: { x: number; y: number };
    /** 图层顺序 */
    layer?: number;
    /** 连接点 */
    joints?: Joint[];
  };
}

/** 应用配置 */
export interface AppConfig {
  assetFolderPath: string;
  deepseekModel: string;
  defaultPixelSize: number;
  defaultPalette: string[];
  showGrid: boolean;
  canvasBgColor: string;
}

/** 画布上的元素 */
export interface CanvasItem {
  id: string;
  assetPath: string;
  x: number;
  y: number;
  scale: number;
  pixelData: PixelAsset;
}

/** AI 对话消息 */
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  relatedAssetPath?: string;
  suggestedChange?: {
    path: string;
    originalJson: PixelAsset;
    modifiedJson: PixelAsset;
  };
}

/** 场景中的素材实例 */
export interface SceneAsset {
  id: string;
  assetPath: string;
  x: number;
  y: number;
  scale: number;
  selected: boolean;
  pixelData: PixelAsset;
}

/** 场景 */
export interface Scene {
  id: string;
  name: string;
  assets: SceneAsset[];
  canvasConfig: {
    width: number;
    height: number;
    bgColor: string;
    pixelSize: number;
  };
  selectedAssetIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 批量 AI 上下文 */
export interface BatchAIContext {
  assets: {
    path: string;
    name: string;
    width: number;
    height: number;
    pixelData: PixelAsset;
  }[];
  selectedPaths: string[];
  sceneName: string;
}

/** 渲染选项 */
export interface RenderOptions {
  showGrid: boolean;
  gridColor: string;
  bgColor: string;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
}

/** 像素编辑器工具类型 */
export type PixelTool = 'brush' | 'eraser' | 'eyedropper' | 'fill';

/** 像素编辑器状态 */
export interface PixelEditorState {
  tool: PixelTool;
  currentColor: string;
  pixels: string[][];
  zoom: number;
  history: string[][][];
  historyIndex: number;
}

/** 调色板 */
export interface Palette {
  name: string;
  colors: string[];
}

/** 风格配置 */
export interface StyleProfile {
  name: string;
  renderStyle: 'flat' | 'rounded' | 'outlined' | 'shadow';
  colorMapping?: {
    hue: number;
    saturation: number;
    brightness: number;
  };
  postProcess?: {
    outline?: { color: string; width: number };
    shadow?: { color: string; offsetX: number; offsetY: number; blur: number };
  };
}

/** 素材信息（列表项） */
export interface AssetInfo {
  name: string;
  path: string;
  width: number;
  height: number;
  preview: string;
  partType?: PartType;
  sizeClass?: string;
}

/** 尺寸标签状态 */
export type SizeLabelStatus = 'ok' | 'missing' | 'mismatch';

/** 告警级别 */
export type AlertLevel = 'error' | 'warning' | 'info';

/** 尺寸告警 */
export interface SizeAlert {
  level: AlertLevel;
  message: string;
  assetPaths?: string[];
  suggestion?: string;
}
