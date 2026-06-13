import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { useAssetStore } from '../../stores/asset-store';
import { useConfigStore } from '../../stores/config-store';
import { pixelRenderer } from '../../lib/pixel-renderer';
import { applyTool, getPixelColor, HistoryManager, deepCopyPixels } from '../../lib/pixel-editor';
import { PALETTE_PRESETS, extractPaletteFromPixels } from '../../lib/palette';
import type { PixelTool, PixelAsset } from '../../types';
import Editor from '@monaco-editor/react';
import AIChatPanel from '../AIChatPanel';

const historyManager = new HistoryManager();

const PixelCanvas: React.FC<{
  pixels: string[][];
  tool: PixelTool;
  currentColor: string;
  zoom: number;
  onPixelChange: (pixels: string[][]) => void;
}> = ({ pixels, tool, currentColor, zoom, onPixelChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (canvasRef.current && pixels.length > 0) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const w = pixels[0]?.length ?? 0;
        const h = pixels.length;
        canvasRef.current.width = w * zoom;
        canvasRef.current.height = h * zoom;

        // 棋盘格背景
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const isLight = (x + y) % 2 === 0;
            ctx.fillStyle = isLight ? '#cccccc' : '#999999';
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }

        pixelRenderer.render(ctx, pixels, zoom);
      }
    }
  }, [pixels, zoom]);

  const getPixelCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    const w = pixels[0]?.length ?? 0;
    const h = pixels.length;
    if (x < 0 || x >= w || y < 0 || y >= h) return null;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getPixelCoords(e);
    if (!coords) return;

    if (tool === 'eyedropper') {
      const color = getPixelColor(pixels, coords.x, coords.y);
      useEditorStore.getState().setCurrentColor(color);
      return;
    }

    isDrawing.current = true;
    const newPixels = applyTool(pixels, coords.x, coords.y, tool, currentColor);
    onPixelChange(newPixels);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    const coords = getPixelCoords(e);
    if (!coords) return;
    if (tool === 'brush' || tool === 'eraser') {
      const newPixels = applyTool(pixels, coords.x, coords.y, tool, currentColor);
      onPixelChange(newPixels);
    }
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ imageRendering: 'pixelated', cursor: tool === 'eyedropper' ? 'crosshair' : 'pointer' }}
    />
  );
};

const EditDialog: React.FC = () => {
  const { isOpen, closeEditor, tool, setTool, currentColor, setCurrentColor, zoom, setZoom } = useEditorStore();
  const { editingAssetPath, editingAssetData, updateAsset, setEditingAsset } = useAssetStore();
  const { config } = useConfigStore();
  const [pixels, setPixels] = useState<string[][]>([]);
  const [jsonStr, setJsonStr] = useState('');
  const [activePalette, setActivePalette] = useState(PALETTE_PRESETS[0]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'json'>('chat');

  useEffect(() => {
    if (editingAssetData?.pixels) {
      setPixels(deepCopyPixels(editingAssetData.pixels));
      setJsonStr(JSON.stringify(editingAssetData, null, 2));
      historyManager.init(editingAssetData.pixels);
      // 提取调色板
      const extracted = extractPaletteFromPixels(editingAssetData.pixels);
      if (extracted.colors.length > 0) {
        setActivePalette(extracted);
      }
    }
  }, [editingAssetData]);

  const handlePixelChange = useCallback((newPixels: string[][]) => {
    setPixels(newPixels);
    historyManager.push(newPixels);
    // 同步到 JSON
    const updated = { ...editingAssetData!, pixels: newPixels, meta: { ...editingAssetData!.meta, updatedAt: new Date().toISOString() } };
    setJsonStr(JSON.stringify(updated, null, 2));
  }, [editingAssetData]);

  const handleJsonChange = useCallback((value: string | undefined) => {
    const str = value || '';
    setJsonStr(str);
    try {
      const parsed = JSON.parse(str);
      if (parsed.pixels && Array.isArray(parsed.pixels)) {
        setPixels(deepCopyPixels(parsed.pixels));
        setJsonError(null);
      }
    } catch {
      setJsonError('JSON 语法错误');
    }
  }, []);

  const handleSave = async () => {
    if (!editingAssetPath || !editingAssetData) return;
    const data: PixelAsset = {
      ...editingAssetData,
      pixels,
      meta: { ...editingAssetData.meta, updatedAt: new Date().toISOString() },
    };
    await updateAsset(editingAssetPath, data);
    setEditingAsset(editingAssetPath, data);
  };

  const handleUndo = () => {
    const prev = historyManager.undo();
    if (prev) {
      setPixels(prev);
      const updated = { ...editingAssetData!, pixels: prev };
      setJsonStr(JSON.stringify(updated, null, 2));
    }
  };

  const handleRedo = () => {
    const next = historyManager.redo();
    if (next) {
      setPixels(next);
      const updated = { ...editingAssetData!, pixels: next };
      setJsonStr(JSON.stringify(updated, null, 2));
    }
  };

  if (!isOpen || !editingAssetData) return null;

  const tools: { key: PixelTool; icon: string; label: string }[] = [
    { key: 'brush', icon: '✏️', label: '画笔' },
    { key: 'eraser', icon: '🧹', label: '橡皮' },
    { key: 'eyedropper', icon: '💧', label: '取色' },
    { key: 'fill', icon: '🪣', label: '填充' },
  ];

  return (
    <div className="edit-dialog-overlay" onClick={closeEditor}>
      <div className="edit-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="edit-dialog-header">
          <h3>编辑: {editingAssetData.name}</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-sm" onClick={handleUndo}>↩️ 撤销</button>
            <button className="btn btn-sm" onClick={handleRedo}>↪️ 重做</button>
            <button className="btn btn-sm btn-primary" onClick={handleSave}>💾 保存</button>
            <button className="btn btn-sm" onClick={closeEditor}>✕</button>
          </div>
        </div>
        <div className="edit-dialog-body">
          <div className="edit-dialog-left">
            <div className="pixel-canvas-container">
              <PixelCanvas
                pixels={pixels}
                tool={tool}
                currentColor={currentColor}
                zoom={zoom}
                onPixelChange={handlePixelChange}
              />
            </div>
            <div className="edit-toolbar">
              {tools.map((t) => (
                <button
                  key={t.key}
                  className={`tool-btn ${tool === t.key ? 'active' : ''}`}
                  onClick={() => setTool(t.key)}
                  title={t.label}
                >
                  {t.icon}
                </button>
              ))}
              <span style={{ width: 8 }} />
              <button className="tool-btn" onClick={() => setZoom(zoom - 1)}>-</button>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{zoom}x</span>
              <button className="tool-btn" onClick={() => setZoom(zoom + 1)}>+</button>
              <div className="color-picker-row">
                <input
                  type="color"
                  value={currentColor.slice(0, 7)}
                  onChange={(e) => setCurrentColor(e.target.value.toUpperCase() + 'FF')}
                />
                <input
                  type="text"
                  value={currentColor}
                  onChange={(e) => setCurrentColor(e.target.value)}
                />
              </div>
            </div>
            <div className="palette-panel">
              {activePalette.colors.map((color, i) => (
                <div
                  key={i}
                  className="palette-color"
                  style={{ background: color.slice(0, 7) }}
                  onClick={() => setCurrentColor(color)}
                  title={color}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, padding: '4px 8px', borderTop: '1px solid var(--border)' }}>
              <select
                value={activePalette.name}
                onChange={(e) => {
                  const preset = PALETTE_PRESETS.find(p => p.name === e.target.value);
                  if (preset) setActivePalette(preset);
                }}
                style={{ fontSize: 11, padding: '2px 4px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                {PALETTE_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
                <option value="extracted">提取颜色</option>
              </select>
            </div>
          </div>
          <div className="edit-dialog-right">
            <div className="edit-dialog-right-tabs">
              <button
                className={`right-tab-btn ${rightPanelMode === 'chat' ? 'active' : ''}`}
                onClick={() => setRightPanelMode('chat')}
              >
                💬 AI 对话
              </button>
              <button
                className={`right-tab-btn ${rightPanelMode === 'json' ? 'active' : ''}`}
                onClick={() => setRightPanelMode('json')}
              >
                📄 JSON
              </button>
            </div>
            <div className="edit-dialog-right-content">
              {rightPanelMode === 'chat' ? (
                <AIChatPanel embedded />
              ) : (
                <>
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={jsonStr}
                    onChange={handleJsonChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                    }}
                  />
                  {jsonError && (
                    <div style={{ position: 'absolute', bottom: 0, right: 0, padding: 8, background: 'var(--error)', color: '#fff', fontSize: 12 }}>
                      {jsonError}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditDialog;
