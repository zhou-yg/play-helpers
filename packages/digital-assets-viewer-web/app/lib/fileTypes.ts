import { AssetType } from '@/app/types/assets';

export const EXTENSION_TO_TYPE: Record<string, AssetType> = {
  // Images
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  svg: 'image',
  tga: 'image',
  bmp: 'image',
  gif: 'image',
  ico: 'image',

  // Videos
  webm: 'video',
  ogv: 'video',
  mp4: 'video',
  avi: 'video',
  mov: 'video',

  // Audio
  wav: 'audio',
  mp3: 'audio',
  ogg: 'audio',
  flac: 'audio',

  // 3D Models (GLB only)
  glb: 'model3d',

  // Scripts
  gd: 'gdscript',

  // Godot Scene
  tscn: 'tscn',
};

export const TYPE_LABELS: Record<AssetType, string> = {
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  model3d: '3D Models',
  gdscript: 'GDScript',
  tscn: 'Scenes',
  unknown: 'Other',
};

export const TYPE_ICONS: Record<AssetType, string> = {
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  model3d: '🎮',
  gdscript: '📜',
  tscn: '🎭',
  unknown: '📄',
};

export function getAssetType(extension: string): AssetType {
  return EXTENSION_TO_TYPE[extension.toLowerCase()] || 'unknown';
}

export function isPreviewable(type: AssetType): boolean {
  return type !== 'unknown';
}
