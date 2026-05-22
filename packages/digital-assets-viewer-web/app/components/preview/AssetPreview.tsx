'use client';

import { useAssets } from '@/app/context/AssetContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';
import { ImagePreview } from './ImagePreview';
import { VideoPreview } from './VideoPreview';
import { AudioPreview } from './AudioPreview';
import { Model3DPreview } from './Model3DPreview';
import { TSCNPreview } from './TSCNPreview';
import { GDScriptPreview } from './GDScriptPreview';
import { TYPE_ICONS, TYPE_LABELS } from '@/app/lib/fileTypes';
import { formatFileSize, formatDate } from '@/app/lib/utils';
import { Badge } from '@/app/components/ui/badge';

export function AssetPreview() {
  const { selectedAsset, selectAsset } = useAssets();

  if (!selectedAsset) return null;

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
      case 'tscn':
        return <TSCNPreview filePath={selectedAsset.path} />;
      case 'gdscript':
        return <GDScriptPreview filePath={selectedAsset.path} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Preview not available for this file type
          </div>
        );
    }
  };

  return (
    <Dialog open={!!selectedAsset} onOpenChange={() => selectAsset(null)}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{TYPE_ICONS[selectedAsset.type]}</span>
            <div>
              <DialogTitle className="text-lg">{selectedAsset.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{TYPE_LABELS[selectedAsset.type]}</Badge>
                <Badge variant="outline">{selectedAsset.extension.toUpperCase()}</Badge>
                <span>{formatFileSize(selectedAsset.size)}</span>
                <span>{formatDate(selectedAsset.modifiedAt)}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted rounded-lg">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
