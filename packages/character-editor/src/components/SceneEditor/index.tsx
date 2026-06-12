import React, { useRef, useEffect } from 'react';
import { useSceneStore } from '../../stores/scene-store';
import { useConfigStore } from '../../stores/config-store';
import { useAssetStore } from '../../stores/asset-store';
import { useAIStore } from '../../stores/ai-store';
import { pixelRenderer } from '../../lib/pixel-renderer';
import { snapToGrid } from '../../lib/drag-drop';
import { checkSizeClassMatch, toSizeClass } from '../../lib/pixel-utils';
import type { SceneAsset } from '../../types';

const SceneAssetComponent: React.FC<{ asset: SceneAsset; pixelSize: number }> = ({ asset, pixelSize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { activeScene, toggleSelectAsset, moveSceneAsset } = useSceneStore();
  const isDragging = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (canvasRef.current && asset.pixelData?.pixels?.length > 0) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const ps = pixelSize * asset.scale;
        const w = asset.pixelData.pixels[0]?.length ?? 0;
        const h = asset.pixelData.pixels.length;
        canvasRef.current.width = w * ps;
        canvasRef.current.height = h * ps;
        pixelRenderer.render(ctx, asset.pixelData.pixels, ps);
      }
    }
  }, [asset.pixelData, pixelSize, asset.scale]);

  const ps = pixelSize * asset.scale;
  const w = (asset.pixelData.pixels[0]?.length ?? 0) * ps;
  const h = (asset.pixelData.pixels.length ?? 0) * ps;
  const sizeW = asset.pixelData.pixels[0]?.length ?? 0;
  const sizeH = asset.pixelData.pixels.length;
  const sc = asset.pixelData.meta?.sizeClass;
  const sizeStatus = checkSizeClassMatch(sc, sizeW);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeScene) {
      toggleSelectAsset(activeScene.id, asset.id, e.ctrlKey || e.metaKey);
    }
    isDragging.current = true;
    dragStart.current = { x: e.clientX - asset.x, y: e.clientY - asset.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !activeScene) return;
    const newX = snapToGrid(e.clientX - dragStart.current.x, pixelSize);
    const newY = snapToGrid(e.clientY - dragStart.current.y, pixelSize);
    moveSceneAsset(activeScene.id, asset.id, newX, newY);
  }, [activeScene, asset.id, pixelSize, moveSceneAsset]);

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
      style={{
        position: 'absolute',
        left: asset.x,
        top: asset.y,
        cursor: 'move',
        outline: asset.selected ? '2px dashed var(--selection)' : '1px solid rgba(255,255,255,0.1)',
        outlineOffset: 1,
      }}
      onMouseDown={handleMouseDown}
    >
      <canvas ref={canvasRef} style={{ width: w, height: h, imageRendering: 'pixelated' }} />
      <div className="canvas-item-size-label top">
        {sizeW}×{sizeH}
      </div>
      <div className={`canvas-item-size-label bottom ${sizeStatus === 'mismatch' ? 'size-label mismatch' : ''}`}>
        {sc || toSizeClass(sizeW)}
      </div>
      {/* 锚点标记 */}
      {asset.pixelData.meta?.anchor && (
        <div
          className="anchor-marker"
          style={{
            left: asset.pixelData.meta.anchor.x * ps,
            top: asset.pixelData.meta.anchor.y * ps,
          }}
        />
      )}
      {/* 连接点标记 */}
      {asset.pixelData.meta?.joints?.map((joint, i) => (
        <div
          key={i}
          className="joint-marker"
          style={{
            left: joint.x * ps,
            top: joint.y * ps,
          }}
          title={joint.name}
        />
      ))}
    </div>
  );
};

import { useCallback } from 'react';

const BatchActionBar: React.FC = () => {
  const { getSelectedAssets, activeScene, saveScene } = useSceneStore();
  const { openPanel, setMode } = useAIStore();
  const selected = getSelectedAssets();

  if (selected.length === 0) return null;

  return (
    <div className="batch-action-bar">
      <span>✓ 已选 {selected.length} 个素材</span>
      <button className="btn btn-sm" title="换色">🎨换色</button>
      <button className="btn btn-sm" title="镜像">🔄镜像</button>
      <button className="btn btn-sm" title="缩放">📏缩放</button>
      <button className="btn btn-sm" title="风格化">🎭风格化</button>
      <button className="btn btn-sm" title="优化">✨优化</button>
      <button className="btn btn-sm" title="清理">🧹清理</button>
      <button
        className="btn btn-sm btn-primary"
        onClick={() => {
          setMode('batch');
          openPanel();
        }}
      >
        🤖AI批量编辑
      </button>
    </div>
  );
};

const SceneEditor: React.FC = () => {
  const { activeScene, fetchScenes, saveScene, checkSizeConsistency, autoFixSizeClass, sizeAlerts, selectAll, clearSelection } = useSceneStore();
  const { assets } = useAssetStore();
  const { config } = useConfigStore();
  const [showAlerts, setShowAlerts] = React.useState(true);

  useEffect(() => {
    fetchScenes();
  }, []);

  useEffect(() => {
    if (activeScene) {
      checkSizeConsistency();
    }
  }, [activeScene]);

  if (!activeScene) return null;

  const ps = activeScene.canvasConfig.pixelSize;

  return (
    <div className="scene-editor">
      <div className="scene-toolbar">
        <span style={{ fontWeight: 600 }}>🎬 {activeScene.name}</span>
        <button className="btn btn-sm" onClick={() => saveScene(activeScene.id)}>💾 保存</button>
        <button className="btn btn-sm" onClick={selectAll}>全选</button>
        <button className="btn btn-sm" onClick={clearSelection}>取消选择</button>
        {sizeAlerts.length > 0 && (
          <button className="btn btn-sm" onClick={() => setShowAlerts(!showAlerts)}>
            ⚠️ {sizeAlerts.length} 告警
          </button>
        )}
      </div>

      <div className="scene-canvas-wrapper">
        {/* 渲染所有素材 */}
        {activeScene.assets.map((asset) => (
          <SceneAssetComponent key={asset.id} asset={asset} pixelSize={ps} />
        ))}

        {/* 尺寸告警面板 */}
        {showAlerts && sizeAlerts.length > 0 && (
          <div className="size-alert-panel">
            <h4>⚠️ 尺寸不一致告警</h4>
            {sizeAlerts.map((alert, i) => (
              <div key={i} className={`size-alert-item ${alert.level}`}>
                {alert.level === 'error' ? '❌' : alert.level === 'warning' ? '⚠️' : '💡'} {alert.message}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <button className="btn btn-sm" onClick={autoFixSizeClass}>自动修复</button>
              <button className="btn btn-sm" onClick={() => setShowAlerts(false)}>忽略</button>
            </div>
          </div>
        )}
      </div>

      <BatchActionBar />
    </div>
  );
};

export default SceneEditor;
