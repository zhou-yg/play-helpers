'use client';

import { useAssets } from '@/app/context/AssetContext';
import { ImagePreview } from './ImagePreview';
import { VideoPreview } from './VideoPreview';
import { AudioPreview } from './AudioPreview';
import { Model3DPreview } from './Model3DPreview';
import { Button } from '@/app/components/ui/button';
import { TYPE_ICONS, TYPE_LABELS } from '@/app/lib/fileTypes';
import { formatFileSize, formatDate } from '@/app/lib/utils';

export function PreviewPanel() {
  const { selectedAsset, selectAsset } = useAssets();

  if (!selectedAsset) {
    return (
      <div className="h-full flex items-center justify-center border-l bg-card">
        <p className="text-muted-foreground">Select an asset to preview</p>
      </div>
    );
  }

  const renderPreview = () => {
    switch (selectedAsset.type) {
      case 'image':
        return <ImagePreview filePath={selectedAsset.path} />;
      case 'video':
        return <VideoPreview filePath={selectedAsset.path} />;
      case 'audio':
        return <AudioPreview filePath={selectedAsset.path} />;
      case 'model3d':
        return <Model3DPreview asset={selectedAsset} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Preview not available for this file type
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col border-l bg-card">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">{TYPE_ICONS[selectedAsset.type]}</span>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{selectedAsset.name}</h3>
            <p className="text-xs text-muted-foreground">
              {TYPE_LABELS[selectedAsset.type]} • {selectedAsset.extension.toUpperCase()} • {formatFileSize(selectedAsset.size)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => selectAsset(null)}>
          ×
        </Button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden">
        {renderPreview()}
      </div>
    </div>
  );
}
