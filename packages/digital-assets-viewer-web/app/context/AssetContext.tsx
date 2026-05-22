'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Asset, AssetType, FilterOptions, ScanResult } from '@/app/types/assets';

interface AssetContextType {
  assets: Asset[];
  filteredAssets: Asset[];
  selectedAsset: Asset | null;
  selectedFolder: string | null;
  filters: FilterOptions;
  isLoading: boolean;
  error: string | null;
  currentPath: string | null;
  scan: (path?: string) => Promise<void>;
  selectAsset: (asset: Asset | null) => void;
  selectFolder: (path: string | null) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
}

const AssetContext = createContext<AssetContextType | null>(null);

const LAST_PATH_KEY = 'dam-viewer-last-path';

export function AssetProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<FilterOptions>({
    search: '',
    types: [],
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  const scan = useCallback(async (path?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = path ? `/api/scan?path=${encodeURIComponent(path)}` : '/api/scan';
      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to scan project');
      }
      const data: ScanResult = await response.json();
      setAssets(data.assets);
      if (data.scannedPath) {
        setCurrentPath(data.scannedPath);
        localStorage.setItem(LAST_PATH_KEY, data.scannedPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectAsset = useCallback((asset: Asset | null) => {
    setSelectedAsset(asset);
  }, []);

  const selectFolder = useCallback((path: string | null) => {
    setSelectedFolder(path);
  }, []);

  const setFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Filter by selected folder
    if (selectedFolder !== null) {
      result = result.filter(asset => {
        // Show assets that are in the selected folder or any subfolder
        return asset.relativePath.startsWith(selectedFolder + '/');
      });
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(asset =>
        asset.name.toLowerCase().includes(searchLower) ||
        asset.relativePath.toLowerCase().includes(searchLower)
      );
    }

    // Filter by types
    if (filters.types.length > 0) {
      result = result.filter(asset => filters.types.includes(asset.type));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'modifiedAt':
          comparison = a.modifiedAt - b.modifiedAt;
          break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [assets, filters, selectedFolder]);

  // Load last path from localStorage on mount
  useEffect(() => {
    const savedPath = localStorage.getItem(LAST_PATH_KEY);
    if (savedPath) {
      scan(savedPath);
    } else {
      scan();
    }
  }, []);

  return (
    <AssetContext.Provider
      value={{
        assets,
        filteredAssets,
        selectedAsset,
        selectedFolder,
        filters,
        isLoading,
        error,
        currentPath,
        scan,
        selectAsset,
        selectFolder,
        setFilters,
      }}
    >
      {children}
    </AssetContext.Provider>
  );
}

export function useAssets() {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
}
