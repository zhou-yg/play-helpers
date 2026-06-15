import React from 'react';
import type { ProcessedImage } from '../../types';

interface ToolbarProps {
  processedImages: ProcessedImage[];
  onExportAll: () => void;
  onExportImage: (dataUrl: string, name: string) => void;
  hasProcessedImages: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  processedImages,
  onExportAll,
  onExportImage,
  hasProcessedImages,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-title">ImageCup</div>

      <div className="toolbar-actions">
        {hasProcessedImages && (
          <>
            <button
              className="btn-toolbar"
              onClick={onExportAll}
              title="导出全部处理结果"
            >
              导出全部
            </button>

            <div className="export-dropdown">
              <button className="btn-toolbar">
                逐个导出 ▾
              </button>
              <div className="dropdown-content">
                {processedImages.map((p) => (
                  <button
                    key={p.id}
                    className="dropdown-item"
                    onClick={() => onExportImage(p.dataUrl, p.name)}
                  >
                    {p.name}
                    {p.isSplit ? ' (拆分)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {!hasProcessedImages && processedImages.length === 0 && (
          <span className="toolbar-hint">
            请先上传图片并设置参数，然后点击处理
          </span>
        )}

        {hasProcessedImages && (
          <span className="toolbar-count">
            已处理 {processedImages.length} 张图片
          </span>
        )}
      </div>
    </div>
  );
};
