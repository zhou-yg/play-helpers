import React, { useRef, useEffect } from 'react';
import { useAssetStore } from '../../stores/asset-store';
import { useConfigStore } from '../../stores/config-store';
import { useEditorStore } from '../../stores/editor-store';
import { pixelRenderer } from '../../lib/pixel-renderer';
import { checkSizeClassMatch, toSizeClass } from '../../lib/pixel-utils';
import type { AssetInfo } from '../../types';
import { useDrag } from 'react-dnd';
import { ASSET_DRAG_TYPE } from '../../lib/drag-drop';
import apiClient from '../../lib/api';

const AssetCard: React.FC<{ asset: AssetInfo }> = ({ asset }) => {
  const { setEditingAsset, deleteAsset, fetchAssets } = useAssetStore();
  const { openEditor } = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixelData, setPixelData] = React.useState<any>(null);

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ASSET_DRAG_TYPE,
    item: { type: ASSET_DRAG_TYPE, asset },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [asset]);

  useEffect(() => {
    // 加载像素数据以渲染缩略图
    apiClient.get('/api/asset', { params: { path: asset.path } })
      .then(({ data }) => {
        setPixelData(data);
      })
      .catch(() => {});
  }, [asset.path]);

  useEffect(() => {
    if (canvasRef.current && pixelData?.pixels) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const thumbSize = 4;
        const w = pixelData.pixels[0]?.length ?? 0;
        const h = pixelData.pixels.length;
        canvasRef.current.width = w * thumbSize;
        canvasRef.current.height = h * thumbSize;
        pixelRenderer.render(ctx, pixelData.pixels, thumbSize);
      }
    }
  }, [pixelData]);

  const sizeStatus = checkSizeClassMatch(asset.sizeClass, asset.width);
  const sizeClassLabel = asset.sizeClass || toSizeClass(asset.width);

  const handleEdit = async () => {
    let data = pixelData;
    if (!data) {
      const response = await apiClient.get('/api/asset', { params: { path: asset.path } });
      data = response.data;
    }
    setEditingAsset(asset.path, data);
    openEditor(asset.path, data);
  };

  const handleDelete = async () => {
    if (confirm(`确定删除 ${asset.name}?`)) {
      await deleteAsset(asset.path);
    }
  };

  return (
    <div
      ref={dragRef as any}
      className="asset-card"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="asset-card-preview">
        <canvas ref={canvasRef} />
      </div>
      <div className="asset-card-name">{asset.name}</div>
      <span className={`size-label ${sizeStatus}`}>
        {asset.width}×{asset.height} {sizeClassLabel}
      </span>
      <div className="asset-card-meta">
        {asset.partType ? `🏷️ ${asset.partType}` : ''} {pixelData?.meta?.layer != null ? `L:${pixelData.meta.layer}` : ''}
      </div>
      <div className="asset-card-actions">
        <button className="btn btn-sm" onClick={handleEdit}>编辑</button>
        <button className="btn btn-sm" onClick={handleDelete} style={{ marginLeft: 4 }}>删除</button>
      </div>
    </div>
  );
};

const AssetBar: React.FC = () => {
  const { assets, loading, sizeFilter, setSizeFilter, fetchAssets, createAsset } = useAssetStore();
  const [showNewDialog, setShowNewDialog] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newSize, setNewSize] = React.useState(16);

  useEffect(() => {
    fetchAssets();
  }, []);

  // 按尺寸分组
  const sizeGroups = React.useMemo(() => {
    const groups = new Map<string, number>();
    assets.forEach((a) => {
      const key = `${a.width}x${a.height}`;
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    return Array.from(groups.entries()).sort();
  }, [assets]);

  const filteredAssets = sizeFilter
    ? assets.filter((a) => `${a.width}x${a.height}` === sizeFilter)
    : assets;

  const abnormalCount = assets.filter(
    (a) => checkSizeClassMatch(a.sizeClass, a.width) !== 'ok'
  ).length;

  const handleCreate = async () => {
    if (newName.trim()) {
      await createAsset(newName.trim(), newSize, newSize);
      setShowNewDialog(false);
      setNewName('');
    }
  };

  return (
    <div className="asset-bar">
      <div className="asset-bar-header">
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
          尺寸筛选:
        </div>
        <div className="size-filter-tabs">
          <span
            className={`size-filter-tab ${!sizeFilter ? 'active' : ''}`}
            onClick={() => setSizeFilter(null)}
          >
            全部
          </span>
          {sizeGroups.map(([size, count]) => (
            <span
              key={size}
              className={`size-filter-tab ${sizeFilter === size ? 'active' : ''}`}
              onClick={() => setSizeFilter(size)}
            >
              {size}({count})
            </span>
          ))}
        </div>
        {abnormalCount > 0 && (
          <div style={{ fontSize: 10, color: 'var(--warning)', marginTop: 4 }}>
            ⚠ {abnormalCount}个尺寸异常
          </div>
        )}
      </div>

      <div className="asset-list">
        {loading ? (
          <div style={{ padding: 8, color: 'var(--text-muted)', fontSize: 12 }}>加载中...</div>
        ) : filteredAssets.length === 0 ? (
          <div style={{ padding: 8, color: 'var(--text-muted)', fontSize: 12 }}>暂无素材</div>
        ) : (
          filteredAssets.map((asset) => (
            <AssetCard key={asset.path} asset={asset} />
          ))
        )}
      </div>

      <button className="new-asset-btn" onClick={() => setShowNewDialog(true)}>
        + 新建
      </button>

      {showNewDialog && (
        <div className="dialog-overlay" onClick={() => setShowNewDialog(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3>新建素材</h3>
            <div className="settings-group">
              <label>名称</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="settings-group">
              <label>尺寸</label>
              <select value={newSize} onChange={(e) => setNewSize(Number(e.target.value))}>
                {[8, 16, 32, 64].map((s) => (
                  <option key={s} value={s}>{s}×{s}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowNewDialog(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetBar;
