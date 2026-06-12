/**
 * JSON 双向同步引擎
 * 编辑弹框中像素编辑器与 JSON Editor 的双向数据绑定
 */
import type { PixelAsset } from '../types';
import { deepCopyPixels } from './pixel-editor';

type SyncDirection = 'both' | 'pixel-to-json' | 'json-to-pixel';

export class SyncEngine {
  private pixelData: PixelAsset | null = null;
  private onPixelUpdate: ((pixels: string[][]) => void) | null = null;
  private onJsonUpdate: ((json: string) => void) | null = null;
  private syncDirection: SyncDirection = 'both';
  private jsonDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pixelDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** 初始化 */
  init(
    data: PixelAsset,
    onPixelUpdate: (pixels: string[][]) => void,
    onJsonUpdate: (json: string) => void
  ): void {
    this.pixelData = data;
    this.onPixelUpdate = onPixelUpdate;
    this.onJsonUpdate = onJsonUpdate;
  }

  /** 像素编辑器变更 → 更新 JSON Editor */
  onPixelChange(pixels: string[][]): void {
    if (!this.pixelData) return;

    this.pixelData = {
      ...this.pixelData,
      pixels: deepCopyPixels(pixels),
      meta: {
        ...this.pixelData.meta,
        updatedAt: new Date().toISOString(),
      },
    };

    if (this.syncDirection === 'json-to-pixel') return;

    if (this.pixelDebounceTimer) clearTimeout(this.pixelDebounceTimer);
    this.pixelDebounceTimer = setTimeout(() => {
      if (this.onJsonUpdate && this.pixelData) {
        this.onJsonUpdate(JSON.stringify(this.pixelData, null, 2));
      }
    }, 100);
  }

  /** JSON Editor 变更 → 更新像素编辑器 */
  onJsonChange(jsonStr: string): void {
    if (this.syncDirection === 'pixel-to-json') return;

    if (this.jsonDebounceTimer) clearTimeout(this.jsonDebounceTimer);
    this.jsonDebounceTimer = setTimeout(() => {
      try {
        const parsed = JSON.parse(jsonStr);
        // 校验基本结构
        if (!parsed.pixels || !Array.isArray(parsed.pixels)) {
          return; // 无效 JSON，保持上一次有效状态
        }
        this.pixelData = parsed as PixelAsset;
        if (this.onPixelUpdate) {
          this.onPixelUpdate(deepCopyPixels(parsed.pixels));
        }
      } catch {
        // JSON 语法错误，保持上一次有效状态
      }
    }, 300);
  }

  /** 设置同步方向 */
  setDirection(direction: SyncDirection): void {
    this.syncDirection = direction;
  }

  /** 获取当前数据 */
  getData(): PixelAsset | null {
    return this.pixelData;
  }

  /** 更新数据（外部设置时） */
  setData(data: PixelAsset): void {
    this.pixelData = data;
  }

  /** 销毁 */
  destroy(): void {
    if (this.jsonDebounceTimer) clearTimeout(this.jsonDebounceTimer);
    if (this.pixelDebounceTimer) clearTimeout(this.pixelDebounceTimer);
    this.onPixelUpdate = null;
    this.onJsonUpdate = null;
    this.pixelData = null;
  }
}
