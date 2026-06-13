import React, { useState } from 'react';
import { useConfigStore } from '../../stores/config-store';
import { useSceneStore } from '../../stores/scene-store';
import { useAssetStore } from '../../stores/asset-store';
import ExportDialog from './ExportDialog';

const TopToolbar: React.FC = () => {
  const { config, setShowGrid, setPixelSize } = useConfigStore();
  const { isSceneMode, enterSceneMode, exitSceneMode, createScene } = useSceneStore();
  const { fetchAssets } = useAssetStore();
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSceneToggle = async () => {
    if (isSceneMode) {
      exitSceneMode();
    } else {
      const scene = await createScene('新场景');
      enterSceneMode(scene.id);
    }
  };

  return (
    <>
      <div className="top-toolbar">
        <span className="toolbar-title">PixelCraft</span>

        <button className="btn" onClick={() => fetchAssets()}>
          🔄 刷新
        </button>

        <button className="btn" onClick={() => setShowExport(true)}>
          📥 导出图片
        </button>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          像素大小:
          <select
            value={config.defaultPixelSize}
            onChange={(e) => setPixelSize(Number(e.target.value))}
            style={{
              padding: '2px 4px',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              fontSize: 12,
            }}
          >
            {[1, 2, 4, 8, 16, 32, 64].map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          网格
        </label>

        <button
          className={`btn ${isSceneMode ? 'btn-primary' : ''}`}
          onClick={handleSceneToggle}
        >
          🎬 场景模式
        </button>

        <span className="toolbar-spacer" />

        <button className="btn btn-icon" onClick={() => setShowSettings(true)}>
          ⚙️
        </button>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </>
  );
};

export default TopToolbar;
