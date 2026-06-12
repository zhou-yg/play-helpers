import React, { useState } from 'react';
import { useCanvasStore } from '../../stores/canvas-store';
import { useConfigStore } from '../../stores/config-store';
import { pixelRenderer } from '../../lib/pixel-renderer';

interface ExportDialogProps {
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ onClose }) => {
  const { items } = useCanvasStore();
  const { config } = useConfigStore();
  const [format, setFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [pixelSize, setPixelSize] = useState(config.defaultPixelSize);
  const [bgColor, setBgColor] = useState(config.canvasBgColor);

  const handleExport = async () => {
    if (items.length === 0) return;

    // 合并所有素材的像素数据到一个画布
    // 简化：导出第一个素材
    const item = items[0];
    if (item.pixelData.pixels.length > 0) {
      const blob = await pixelRenderer.exportToImage(item.pixelData.pixels, pixelSize, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.pixelData.name || 'pixel-art'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }

    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content export-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>📥 导出图片</h3>

        <div className="form-group">
          <label>格式</label>
          <select value={format} onChange={(e) => setFormat(e.target.value as any)}>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        <div className="form-group">
          <label>像素大小</label>
          <select value={pixelSize} onChange={(e) => setPixelSize(Number(e.target.value))}>
            {[1, 2, 4, 8, 16, 32, 64].map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>背景色</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleExport}>导出</button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
