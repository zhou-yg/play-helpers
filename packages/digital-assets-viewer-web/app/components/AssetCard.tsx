'use client';

import { memo } from 'react';
import { Asset } from '@/app/types/assets';
import { useAssets } from '@/app/context/AssetContext';
import { TYPE_ICONS } from '@/app/lib/fileTypes';
import { formatFileSize } from '@/app/lib/utils';

interface AssetCardProps {
  asset: Asset;
}

export const AssetCard = memo(function AssetCard({ asset }: AssetCardProps) {
  const { selectAsset } = useAssets();

  return (
    <div
      className="group relative flex flex-col bg-card rounded-lg border overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-primary"
      onClick={() => selectAsset(asset)}
    >
      {/* Thumbnail */}
      <div className="aspect-square relative bg-muted flex items-center justify-center overflow-hidden">
        {asset.type === 'image' ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.name}
            className="object-contain w-full h-full"
            loading="lazy"
          />
        ) : (
          <div className="text-5xl">{TYPE_ICONS[asset.type]}</div>
        )}

        {/* Type Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
          {asset.extension.toUpperCase()}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        <h3 className="font-medium text-sm truncate" title={asset.name}>
          {asset.name}
        </h3>
        <p className="text-xs text-muted-foreground truncate" title={asset.relativePath}>
          {asset.relativePath}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(asset.size)}
        </p>
      </div>
    </div>
  );
});
