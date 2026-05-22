'use client';

import { useAssets } from '@/app/context/AssetContext';
import { FilterBar } from '@/app/components/FilterBar';
import { AssetList } from '@/app/components/AssetList';
import { PreviewPanel } from '@/app/components/preview/PreviewPanel';
import { FileTree } from '@/app/components/FileTree';
import { DirectoryInput } from '@/app/components/DirectoryInput';
import { Button } from '@/app/components/ui/button';

export const dynamic = 'force-dynamic';

export default function Home() {
  const { filteredAssets, filters, isLoading, selectedFolder, selectFolder } = useAssets();

  return (
    <main className="h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 border-b flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DAM Resource Viewer</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? 'Scanning...'
                : `${filteredAssets.length} assets${
                    selectedFolder ? ` in "${selectedFolder}"` : ''
                  }${
                    filters.types.length > 0
                      ? ` (filtered from ${filters.types.length} types)`
                      : ''
                  }${filters.search ? ` matching "${filters.search}"` : ''}`}
            </p>
            {selectedFolder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectFolder(null)}
              >
                Clear folder
              </Button>
            )}
          </div>
        </div>
        <DirectoryInput />
      </header>

      {/* Body: Sidebar + List + Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Tree Sidebar */}
        <div className="w-56 flex-shrink-0">
          <FileTree />
        </div>

        {/* Main Content: FilterBar + List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <FilterBar />
          <div className="flex-1 overflow-hidden">
            <AssetList />
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="w-[500px] flex-shrink-0">
          <PreviewPanel />
        </div>
      </div>
    </main>
  );
}
