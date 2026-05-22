'use client';

import { useAssets } from '@/app/context/AssetContext';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { TYPE_ICONS } from '@/app/lib/fileTypes';
import { formatFileSize } from '@/app/lib/utils';

export function AssetList() {
  const { filteredAssets, selectedAsset, selectAsset, isLoading } = useAssets();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (filteredAssets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No assets found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b">
          <tr className="text-left">
            <th className="py-2 px-4 font-medium">Name</th>
            <th className="py-2 px-4 font-medium w-20">Type</th>
            <th className="py-2 px-4 font-medium w-24">Size</th>
          </tr>
        </thead>
        <tbody>
          {filteredAssets.map((asset) => (
            <tr
              key={asset.id}
              className={`border-b cursor-pointer hover:bg-accent ${
                selectedAsset?.id === asset.id ? 'bg-accent' : ''
              }`}
              onClick={() => selectAsset(asset)}
            >
              <td className="py-2 px-4">
                <div className="flex items-center gap-2">
                  <span>{TYPE_ICONS[asset.type]}</span>
                  <span className="truncate">{asset.name}</span>
                </div>
              </td>
              <td className="py-2 px-4 text-muted-foreground">
                {asset.extension.toUpperCase()}
              </td>
              <td className="py-2 px-4 text-muted-foreground">
                {formatFileSize(asset.size)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}
