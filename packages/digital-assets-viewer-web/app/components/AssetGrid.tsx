'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAssets } from '@/app/context/AssetContext';
import { AssetCard } from '@/app/components/AssetCard';
import { ScrollArea } from '@/app/components/ui/scroll-area';

const CARD_WIDTH = 200;
const CARD_HEIGHT = 240;
const GAP = 16;

export function AssetGrid() {
  const { filteredAssets, isLoading, error } = useAssets();
  const parentRef = useRef<HTMLDivElement>(null);

  const columnsCount = typeof window !== 'undefined'
    ? Math.max(1, Math.floor((window.innerWidth - 64) / (CARD_WIDTH + GAP)))
    : 6;

  const rows = Math.ceil(filteredAssets.length / columnsCount);

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 3,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Scanning project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error: {error}</p>
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
    <ScrollArea className="h-[calc(100vh-200px)]" ref={parentRef as never}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowStartIndex = virtualRow.index * columnsCount;
          const rowAssets = filteredAssets.slice(
            rowStartIndex,
            rowStartIndex + columnsCount
          );

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="flex gap-4 px-4"
            >
              {rowAssets.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    flexShrink: 0,
                  }}
                >
                  <AssetCard asset={asset} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
