import React, { useRef, useEffect, useCallback } from 'react';
import { useCanvasStore } from '../../stores/canvas-store';
import { useConfigStore } from '../../stores/config-store';
import { useAssetStore } from '../../stores/asset-store';
import { pixelRenderer } from '../../lib/pixel-renderer';
import { createCanvasItem, ASSET_DRAG_TYPE, snapToGrid } from '../../lib/drag-drop';
import { useDrop } from 'react-dnd';
import type { AssetDragItem } from '../../lib/drag-drop';
import type { CanvasItem as CanvasItemType } from '../../types';
import apiClient from '../../lib/api';

const CanvasItemComponent: React.FC<{ item: CanvasItemType }> = ({ item }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { config } = useConfigStore();
  const { selectItem, selectedItemId, moveItem } = useCanvasStore();
  const isDragging = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (canvasRef.current && item.pixelData?.pixels?.length > 0) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const ps = config.defaultPixelSize;
        const w = item.pixelData.pixels[0]?.length ?? 0;
        const h = item.pixelData.pixels.length;
        canvasRef.current.width = w * ps;
        canvasRef.current.height = h * ps;
        pixelRenderer.render(ctx, item.pixelData.pixels, ps, {
          showGrid: config.showGrid && ps >= 4,
          gridColor: 'rgba(255,255,255,0.1)',
          bgColor: 'transparent',
        });
      }
    }
  }, [item.pixelData, config.defaultPixelSize, config.showGrid]);

  const isSelected = selectedItemId === item.id;
  const ps = config.defaultPixelSize;
  const w = (item.pixelData.pixels[0]?.length ?? 0) * ps * item.scale;
  const h = (item.pixelData.pixels.length ?? 0) * ps * item.scale;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectItem(item.id);
    isDragging.current = true;
    dragStart.current = { x: e.clientX - item.x, y: e.clientY - item.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    moveItem(item.id, snapToGrid(newX, ps), snapToGrid(newY, ps));
  }, [item.id, ps, moveItem]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (isDragging.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`canvas-item ${isSelected ? 'selected' : ''}`}
      style={{ left: item.x, top: item.y, width: w, height: h }}
      onMouseDown={handleMouseDown}
    >
      <canvas ref={canvasRef} style={{ width: w, height: h }} />
      <div className="canvas-item-size-label top">
        {item.pixelData.pixels[0]?.length ?? 0}×{item.pixelData.pixels.length}
      </div>
      <div className="canvas-item-size-label bottom">
        {item.pixelData.meta?.sizeClass || `${item.pixelData.pixels[0]?.length ?? 0}w`}
      </div>
    </div>
  );
};

const CanvasArea: React.FC = () => {
  const { items, selectItem, panX, panY, zoom } = useCanvasStore();
  const { config } = useConfigStore();
  const { addItem } = useCanvasStore();
  const assetStore = useAssetStore();

  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: ASSET_DRAG_TYPE,
      drop: (dragItem: AssetDragItem, monitor) => {
        const offset = monitor.getClientOffset();
        if (offset) {
          const canvasItem = createCanvasItem(dragItem.asset, offset.x - 100, offset.y - 60);
          // 异步加载像素数据
          apiClient.get('/api/asset', { params: { path: dragItem.asset.path } })
            .then(({ data }) => {
              canvasItem.pixelData = data;
              addItem(canvasItem);
            });
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [addItem]
  );

  const handleCanvasClick = () => {
    selectItem(null);
  };

  return (
    <div
      ref={dropRef as any}
      className="canvas-area"
      onClick={handleCanvasClick}
      style={{ background: isOver ? 'rgba(59,130,246,0.05)' : config.canvasBgColor }}
    >
      {items.length === 0 ? (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🖼️</div>
          <div>从左侧素材栏拖拽素材到此处</div>
        </div>
      ) : (
        items.map((item) => (
          <CanvasItemComponent key={item.id} item={item} />
        ))
      )}
    </div>
  );
};

export default CanvasArea;
