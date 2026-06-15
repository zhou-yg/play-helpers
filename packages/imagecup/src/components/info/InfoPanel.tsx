import React, { useEffect, useState } from 'react';
import type { ImageFile } from '../../types';
import { CollapsibleSection } from '../common';

interface ImageDimensions {
  width: number;
  height: number;
}

interface PixelBlockInfo {
  /** 像素块基本单元大小 (宽) */
  blockWidth: number;
  /** 像素块基本单元大小 (高) */
  blockHeight: number;
  /** 检测置信度 */
  confidence: 'high' | 'medium' | 'low';
}

interface InfoPanelProps {
  image: ImageFile | null;
  imageElement?: HTMLImageElement | null;
}

/**
 * 检测像素图的基本单元大小
 * 通过分析图片中颜色变化的最小间隔来确定像素块尺寸
 */
function detectPixelBlockSize(
  img: HTMLImageElement
): PixelBlockInfo {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // 采样若干行和列，统计颜色变化间隔
  const rowIntervals: number[] = [];
  const colIntervals: number[] = [];

  // 采样行数（最多采样 20 行，均匀分布）
  const sampleRows = Math.min(20, height);
  const rowStep = Math.max(1, Math.floor(height / (sampleRows + 1)));

  for (let s = 1; s <= sampleRows; s++) {
    const y = Math.min(height - 1, s * rowStep);
    let lastChangeX = 0;
    for (let x = 1; x < width; x++) {
      const idx1 = (y * width + x - 1) * 4;
      const idx2 = (y * width + x) * 4;
      if (
        data[idx1] !== data[idx2] ||
        data[idx1 + 1] !== data[idx2 + 1] ||
        data[idx1 + 2] !== data[idx2 + 2] ||
        data[idx1 + 3] !== data[idx2 + 3]
      ) {
        const interval = x - lastChangeX;
        if (interval > 0) rowIntervals.push(interval);
        lastChangeX = x;
      }
    }
    // 最后一段
    const lastInterval = width - lastChangeX;
    if (lastInterval > 0) rowIntervals.push(lastInterval);
  }

  // 采样列数
  const sampleCols = Math.min(20, width);
  const colStep = Math.max(1, Math.floor(width / (sampleCols + 1)));

  for (let s = 1; s <= sampleCols; s++) {
    const x = Math.min(width - 1, s * colStep);
    let lastChangeY = 0;
    for (let y = 1; y < height; y++) {
      const idx1 = ((y - 1) * width + x) * 4;
      const idx2 = (y * width + x) * 4;
      if (
        data[idx1] !== data[idx2] ||
        data[idx1 + 1] !== data[idx2 + 1] ||
        data[idx1 + 2] !== data[idx2 + 2] ||
        data[idx1 + 3] !== data[idx2 + 3]
      ) {
        const interval = y - lastChangeY;
        if (interval > 0) colIntervals.push(interval);
        lastChangeY = y;
      }
    }
    const lastInterval = height - lastChangeY;
    if (lastInterval > 0) colIntervals.push(lastInterval);
  }

  // 使用 GCD 找到最小公共间隔
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const arrayGcd = (arr: number[]): number => {
    if (arr.length === 0) return 1;
    return arr.reduce((acc, val) => gcd(acc, val));
  };

  const blockWidth = arrayGcd(rowIntervals);
  const blockHeight = arrayGcd(colIntervals);

  // 置信度评估
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (blockWidth > 1 || blockHeight > 1) {
    // 检查间隔中大多数是否是 blockWidth/blockHeight 的整数倍
    const rowMultipleRatio = rowIntervals.filter((v) => v % blockWidth === 0).length / rowIntervals.length;
    const colMultipleRatio = colIntervals.filter((v) => v % blockHeight === 0).length / colIntervals.length;
    const avgRatio = (rowMultipleRatio + colMultipleRatio) / 2;

    if (avgRatio > 0.9) confidence = 'high';
    else if (avgRatio > 0.7) confidence = 'medium';
    else confidence = 'low';
  } else {
    // blockWidth === 1 && blockHeight === 1，可能是普通图片
    confidence = 'low';
  }

  return { blockWidth, blockHeight, confidence };
}

const confidenceLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const confidenceColors: Record<string, string> = {
  high: '#4caf50',
  medium: '#ff9800',
  low: '#9e9e9e',
};

export const InfoPanel: React.FC<InfoPanelProps> = ({ image, imageElement }) => {
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [pixelBlock, setPixelBlock] = useState<PixelBlockInfo | null>(null);

  useEffect(() => {
    if (!image || !imageElement) {
      setDimensions(null);
      setPixelBlock(null);
      return;
    }

    setDimensions({
      width: imageElement.naturalWidth,
      height: imageElement.naturalHeight,
    });

    // 检测像素块大小
    try {
      const blockInfo = detectPixelBlockSize(imageElement);
      setPixelBlock(blockInfo);
    } catch {
      setPixelBlock(null);
    }
  }, [image, imageElement]);

  if (!image) {
    return (
      <CollapsibleSection title="图片信息" defaultExpanded={false}>
        <div className="info-empty">
          <p>请先选择图片查看信息</p>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="图片信息" defaultExpanded={false}>
      <div className="setting-group">
        <label>文件名</label>
        <p className="info-value info-filename">{image.name}</p>
      </div>

      {dimensions && (
        <div className="setting-group">
          <label>图片尺寸</label>
          <div className="info-dimensions">
            <span className="info-value">{dimensions.width}</span>
            <span className="info-separator">×</span>
            <span className="info-value">{dimensions.height}</span>
            <span className="info-unit">像素</span>
          </div>
        </div>
      )}

      {pixelBlock && (
        <div className="setting-group">
          <label>像素块单元</label>
          <div className="info-pixel-block">
            {pixelBlock.blockWidth > 1 || pixelBlock.blockHeight > 1 ? (
              <>
                <div className="info-dimensions">
                  <span className="info-value info-value-highlight">{pixelBlock.blockWidth}</span>
                  <span className="info-separator">×</span>
                  <span className="info-value info-value-highlight">{pixelBlock.blockHeight}</span>
                  <span className="info-unit">像素/块</span>
                </div>
                <div className="info-confidence">
                  <span
                    className="confidence-badge"
                    style={{ backgroundColor: confidenceColors[pixelBlock.confidence] }}
                  >
                    置信度: {confidenceLabels[pixelBlock.confidence]}
                  </span>
                </div>
                <p className="setting-desc">
                  检测到该图可能为像素画，每个逻辑像素由 {pixelBlock.blockWidth}×{pixelBlock.blockHeight} 个物理像素组成
                </p>
              </>
            ) : (
              <>
                <p className="info-value">1×1</p>
                <p className="setting-desc">
                  未检测到像素块结构，该图可能为普通位图
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {dimensions && pixelBlock && (pixelBlock.blockWidth > 1 || pixelBlock.blockHeight > 1) && (
        <div className="setting-group">
          <label>逻辑尺寸</label>
          <div className="info-dimensions">
            <span className="info-value">{Math.round(dimensions.width / pixelBlock.blockWidth)}</span>
            <span className="info-separator">×</span>
            <span className="info-value">{Math.round(dimensions.height / pixelBlock.blockHeight)}</span>
            <span className="info-unit">像素块</span>
          </div>
          <p className="setting-desc">
            以像素块为基本单元的逻辑尺寸
          </p>
        </div>
      )}
    </CollapsibleSection>
  );
};
