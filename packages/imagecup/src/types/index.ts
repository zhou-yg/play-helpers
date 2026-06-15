export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
}

export interface ProcessedImage {
  id: string;
  originalId: string;
  dataUrl: string;
  name: string;
  isSplit: boolean;
  splitIndex?: number;
}

export interface ColorRange {
  color: string;
  label: string;
}

export type ProcessingMode = 'global' | 'edge-to-center';

export interface ProcessingSettings {
  targetColors: RGBColor[];
  tolerance: number;
  autoSplit: boolean;
  processingMode: ProcessingMode;
}

export interface AppState {
  images: ImageFile[];
  processedImages: ProcessedImage[];
  settings: ProcessingSettings;
  selectedImageId: string | null;
  previewMode: 'original' | 'cleaned' | 'split';
}
