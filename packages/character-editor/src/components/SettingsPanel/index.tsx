import React from 'react';
import { useConfigStore } from '../../stores/config-store';

const SettingsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { config, updateConfig } = useConfigStore();

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-panel">
        <h3>⚙️ 设置</h3>

        <div className="settings-group">
          <label>素材文件夹路径</label>
          <input
            value={config.assetFolderPath}
            onChange={(e) => updateConfig({ assetFolderPath: e.target.value })}
            placeholder="/path/to/assets"
          />
        </div>

        <div className="settings-group">
          <label>DeepSeek 模型</label>
          <select
            value={config.deepseekModel}
            onChange={(e) => updateConfig({ deepseekModel: e.target.value })}
          >
            <option value="deepseek-v4-pro">deepseek-v4-pro</option>
            <option value="deepseek-chat">deepseek-chat</option>
            <option value="deepseek-reasoner">deepseek-reasoner</option>
          </select>
        </div>

        <div className="settings-group">
          <label>默认像素大小</label>
          <select
            value={config.defaultPixelSize}
            onChange={(e) => updateConfig({ defaultPixelSize: Number(e.target.value) })}
          >
            {[1, 2, 4, 8, 16, 32, 64].map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>

        <div className="settings-group">
          <label>画布背景色</label>
          <input
            type="color"
            value={config.canvasBgColor}
            onChange={(e) => updateConfig({ canvasBgColor: e.target.value })}
          />
        </div>

        <div className="settings-group">
          <label>显示网格</label>
          <input
            type="checkbox"
            checked={config.showGrid}
            onChange={(e) => updateConfig({ showGrid: e.target.checked })}
          />
        </div>

        <button className="btn" onClick={onClose} style={{ marginTop: 16 }}>
          关闭
        </button>
      </div>
    </>
  );
};

export default SettingsPanel;
