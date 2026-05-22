export type AssetType =
  | 'image'
  | 'video'
  | 'audio'
  | 'model3d'
  | 'gdscript'
  | 'tscn'
  | 'unknown';

export interface Asset {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  type: AssetType;
  extension: string;
  size: number;
  modifiedAt: number;
  thumbnailUrl?: string;
}

export interface ScanResult {
  assets: Asset[];
  totalCount: number;
  typeCounts: Record<AssetType, number>;
  scannedPath?: string;
  error?: string;
}

export interface FilterOptions {
  search: string;
  types: AssetType[];
  sortBy: 'name' | 'size' | 'modifiedAt';
  sortOrder: 'asc' | 'desc';
}
