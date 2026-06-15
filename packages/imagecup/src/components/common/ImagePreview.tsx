import React, { useCallback, useRef, useState } from 'react';
import type { ImageFile, ProcessedImage } from '../../types';
import type { RGBColor } from '../../types';
import { ImageUploader } from './ImageUploader';

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function extractUniqueColors(data: Uint8ClampedArray): RGBColor[] {
  const colorMap = new Map<string, RGBColor>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    if (!colorMap.has(key)) {
      colorMap.set(key, { r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }
  return Array.from(colorMap.values());
}

interface ImagePreviewProps {
  images: ImageFile[];
  selectedImageId: string | null;
  previewMode: 'original' | 'cleaned' | 'split';
  originalUrl: string | null;
  cleanedUrl: string | null;
  splitUrls: string[];
  processedImages: ProcessedImage[];
  onSelectImage: (id: string) => void;
  onRemoveImage: (id: string) => void;
  onPreviewModeChange: (mode: 'original' | 'cleaned' | 'split') => void;
  onColorsPick?: (colors: RGBColor[]) => void;
  onAddImages?: (files: FileList | File[]) => Promise<unknown>;
  /** 选中的图片元素，供外部模块获取图片尺寸等信息 */
  onImageLoad?: (img: HTMLImageElement) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  selectedImageId,
  previewMode,
  originalUrl,
  cleanedUrl,
  splitUrls,
  processedImages,
  onSelectImage,
  onRemoveImage,
  onPreviewModeChange,
  onColorsPick,
  onAddImages,
  onImageLoad,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pickContainerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    imgStartX: number;
    imgStartY: number;
    displayStartX: number;
    displayStartY: number;
    imgRect: DOMRect;
  } | null>(null);
  const isSplitMode = previewMode === 'split' && splitUrls.length > 0;

  const getContainerRelative = useCallback((clientX: number, clientY: number) => {
    const container = pickContainerRef.current;
    if (!container) return null;
    const cRect = container.getBoundingClientRect();
    return {
      displayX: clientX - cRect.left,
      displayY: clientY - cRect.top,
    };
  }, []);

  const getImageCoord = useCallback((clientX: number, clientY: number) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    return {
      imgX: Math.max(0, Math.min(img.naturalWidth - 1, Math.round((clientX - rect.left) * scaleX))),
      imgY: Math.max(0, Math.min(img.naturalHeight - 1, Math.round((clientY - rect.top) * scaleY))),
      rect,
      scaleX,
      scaleY,
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (!onColorsPick) return;
      e.preventDefault();
      e.stopPropagation();

      const coord = getImageCoord(e.clientX, e.clientY);
      const containerCoord = getContainerRelative(e.clientX, e.clientY);
      if (!coord || !containerCoord) return;

      dragRef.current = {
        imgStartX: coord.imgX,
        imgStartY: coord.imgY,
        displayStartX: containerCoord.displayX,
        displayStartY: containerCoord.displayY,
        imgRect: coord.rect,
      };

      setSelection({
        startX: containerCoord.displayX,
        startY: containerCoord.displayY,
        endX: containerCoord.displayX,
        endY: containerCoord.displayY,
      });
      setIsDragging(true);
    },
    [onColorsPick, getImageCoord, getContainerRelative]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !dragRef.current || !imgRef.current) return;
      e.preventDefault();

      const containerRect = pickContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const displayX = e.clientX - containerRect.left;
      const displayY = e.clientY - containerRect.top;

      const imgRect = imgRef.current.getBoundingClientRect();
      // clamp to image bounds for visual selection rect
      const clampedX = Math.max(imgRect.left - containerRect.left, Math.min(imgRect.right - containerRect.left, displayX));
      const clampedY = Math.max(imgRect.top - containerRect.top, Math.min(imgRect.bottom - containerRect.top, displayY));

      setSelection({
        startX: dragRef.current.displayStartX,
        startY: dragRef.current.displayStartY,
        endX: clampedX,
        endY: clampedY,
      });
    },
    [isDragging]
  );

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const state = dragRef.current;
      const canvas = canvasRef.current;
      if (!state || !canvas) return;

      const imgRect = imgRef.current?.getBoundingClientRect();
      if (!imgRect) return;

      const scaleX = canvas.width / imgRect.width;
      const scaleY = canvas.height / imgRect.height;

      // end point in image pixel coordinates
      const endImgX = Math.max(
        0,
        Math.min(canvas.width - 1, Math.round((clientX - imgRect.left) * scaleX))
      );
      const endImgY = Math.max(
        0,
        Math.min(canvas.height - 1, Math.round((clientY - imgRect.top) * scaleY))
      );

      const minX = Math.min(state.imgStartX, endImgX);
      const minY = Math.min(state.imgStartY, endImgY);
      const maxX = Math.max(state.imgStartX, endImgX);
      const maxY = Math.max(state.imgStartY, endImgY);
      const w = maxX - minX;
      const h = maxY - minY;

      if (w < 2 && h < 2) {
        const pixel = canvas.getContext('2d')!.getImageData(minX, minY, 1, 1).data;
        onColorsPick?.([{ r: pixel[0], g: pixel[1], b: pixel[2] }]);
      } else {
        const imageData = canvas.getContext('2d')!.getImageData(minX, minY, w, h);
        const colors = extractUniqueColors(imageData.data);
        onColorsPick?.(colors);
      }
    },
    [onColorsPick]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.preventDefault();
      finishDrag(e.clientX, e.clientY);
      setIsDragging(false);
      dragRef.current = null;
      setSelection(null);
    },
    [isDragging, finishDrag]
  );

  const handleContainerMouseLeave = useCallback(() => {
    if (!isDragging) return;
    // Cancel drag when leaving the container
    setIsDragging(false);
    dragRef.current = null;
    setSelection(null);
  }, [isDragging]);

  const syncCanvas = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    // 通知外部图片已加载
    onImageLoad?.(img);
  }, [onImageLoad]);

  if (images.length === 0) {
    return (
      <div className="preview-empty">
        <div className="empty-icon">📷</div>
        <p>请先上传图片</p>
      </div>
    );
  }

  return (
    <div className="image-preview">
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="image-list">
        {images.map((image) => (
          <div
            key={image.id}
            className={`image-thumb ${selectedImageId === image.id ? 'selected' : ''}`}
            onClick={() => onSelectImage(image.id)}
          >
            <img src={image.url} alt={image.name} />
            <span className="thumb-name">{image.name}</span>
            <button
              className="thumb-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveImage(image.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
        {images.length > 0 && onAddImages && (
          <ImageUploader compact onAddImages={onAddImages} />
        )}
      </div>

      {selectedImageId && (
        <>
          <div className="preview-tabs">
            <button
              className={`tab ${previewMode === 'original' ? 'active' : ''}`}
              onClick={() => onPreviewModeChange('original')}
            >
              原图
            </button>
            <button
              className={`tab ${previewMode === 'cleaned' ? 'active' : ''}`}
              onClick={() => onPreviewModeChange('cleaned')}
              disabled={!cleanedUrl}
            >
              清理后
            </button>
            <button
              className={`tab ${previewMode === 'split' ? 'active' : ''}`}
              onClick={() => onPreviewModeChange('split')}
              disabled={splitUrls.length === 0}
            >
              拆分 ({splitUrls.length})
            </button>
          </div>

          <div className="preview-main">
            {previewMode === 'original' && originalUrl && (
              <div
                ref={pickContainerRef}
                className="preview-image preview-image-pickable"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleContainerMouseLeave}
              >
                <img
                  ref={imgRef}
                  src={originalUrl}
                  alt="原图"
                  draggable={false}
                  onMouseDown={handleMouseDown}
                  onLoad={syncCanvas}
                  title={onColorsPick ? '拖拽框选背景颜色区域' : ''}
                />
                {selection && (
                  <div
                    className="selection-rect"
                    style={{
                      left: Math.min(selection.startX, selection.endX),
                      top: Math.min(selection.startY, selection.endY),
                      width: Math.abs(selection.endX - selection.startX),
                      height: Math.abs(selection.endY - selection.startY),
                    }}
                  />
                )}
              </div>
            )}
            {previewMode === 'cleaned' && cleanedUrl && (
              <div className="preview-image">
                <img src={cleanedUrl} alt="清理后" />
              </div>
            )}
            {isSplitMode && (
              <div className="split-grid">
                {splitUrls.map((url, i) => (
                  <div key={i} className="split-item">
                    <img src={url} alt={`拆分 ${i + 1}`} />
                    <span className="split-label">
                      {processedImages.find(
                        (p) => p.originalId === selectedImageId && p.splitIndex === i
                      )?.name ?? `part${i + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {previewMode === 'split' && splitUrls.length === 0 && (
              <div className="preview-empty">
                <p>暂无拆分结果，请在右侧开启自动拆分并重新处理</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
