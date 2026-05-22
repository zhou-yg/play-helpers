import fs from 'fs';
import path from 'path';
import { Asset, AssetType } from '@/app/types/assets';
import { getAssetType, EXTENSION_TO_TYPE } from './fileTypes';

function generateId(filePath: string): string {
  return Buffer.from(filePath).toString('base64').replace(/\//g, '_');
}

function scanDirectory(dirPath: string, basePath: string): Asset[] {
  const assets: Asset[] = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories and common non-asset directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          assets.push(...scanDirectory(fullPath, basePath));
        }
      } else if (entry.isFile()) {
        const extension = path.extname(entry.name).slice(1).toLowerCase();
        const assetType = getAssetType(extension);

        // Skip files without recognized extensions and script/scene files
        if (extension && assetType !== 'unknown' && assetType !== 'gdscript' && assetType !== 'tscn') {
          try {
            const stats = fs.statSync(fullPath);
            assets.push({
              id: generateId(fullPath),
              name: entry.name,
              path: fullPath,
              relativePath: path.relative(basePath, fullPath),
              type: assetType,
              extension,
              size: stats.size,
              modifiedAt: stats.mtimeMs,
              thumbnailUrl: `/api/thumbnail?path=${encodeURIComponent(fullPath)}&type=${assetType}`,
            });
          } catch {
            // Skip files we can't stat
          }
        }
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return assets;
}

function expandUser(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    return filepath.replace(/^~/, home);
  }
  return filepath;
}

export function scanProject(projectPath: string): Asset[] {
  const expandedPath = expandUser(projectPath);

  if (!fs.existsSync(expandedPath)) {
    return [];
  }

  return scanDirectory(expandedPath, expandedPath);
}

export function getTypeCounts(assets: Asset[]): Record<AssetType, number> {
  const counts: Record<AssetType, number> = {
    image: 0,
    video: 0,
    audio: 0,
    model3d: 0,
    gdscript: 0,
    tscn: 0,
    unknown: 0,
  };

  for (const asset of assets) {
    counts[asset.type]++;
  }

  return counts;
}
