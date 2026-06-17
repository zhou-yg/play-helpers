import { useState, useCallback, useRef } from 'react';
import type { ImageFile, ProcessedImage, ProcessingSettings, RGBColor, ProcessingMode } from '../types';
import { loadImageFromFile, processImage } from '../utils/imageProcessor';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function getBaseName(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
}

export function useImageProcessing() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'original' | 'cleaned' | 'split'>('original');
  const [settings, setSettings] = useState<ProcessingSettings>({
    targetColors: [{ r: 255, g: 255, b: 255 }],
    tolerance: 30,
    autoSplit: false,
    processingMode: 'edge-to-center',
  });
  const processingRef = useRef(false);

  const addImages = useCallback(async (files: FileList | File[]) => {
    const newImages: ImageFile[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const id = generateId();
      newImages.push({
        id,
        file,
        url: URL.createObjectURL(file),
        name: getBaseName(file.name),
      });
    }
    setImages((prev) => [...prev, ...newImages]);

    if (selectedImageId === null && newImages.length > 0) {
      setSelectedImageId(newImages[0].id);
    }

    return newImages;
  }, [selectedImageId]);

  const removeImage = useCallback((imageId: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === imageId);
      if (image) URL.revokeObjectURL(image.url);
      return prev.filter((img) => img.id !== imageId);
    });
    setProcessedImages((prev) =>
      prev.filter((p) => p.originalId !== imageId)
    );
    if (selectedImageId === imageId) {
      setSelectedImageId(null);
    }
  }, [selectedImageId]);

  const processCurrentImage = useCallback(
    async (imageId: string) => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        const imageFile = images.find((img) => img.id === imageId);
        if (!imageFile) {
          processingRef.current = false;
          return;
        }

        const img = await loadImageFromFile(imageFile.file);
        const currentSettings = settings;
        
        console.log('[processCurrentImage] autoSplit:', currentSettings.autoSplit, 'processingMode:', currentSettings.processingMode, 'targetColors:', currentSettings.targetColors, 'tolerance:', currentSettings.tolerance);

        const results = processImage(
          img,
          currentSettings.targetColors,
          currentSettings.tolerance,
          currentSettings.autoSplit,
          imageFile.name,
          imageId,
          currentSettings.processingMode
        );

        console.log('[processCurrentImage] results count:', results.length, 'split pieces:', results.filter(r => r.isSplit).length);

        setProcessedImages((prev) => {
          const others = prev.filter((p) => p.originalId !== imageId);
          return [...others, ...results];
        });

        const hasSplit = results.some((r) => r.isSplit);
        setPreviewMode(hasSplit ? 'split' : 'cleaned');
      } catch (err) {
        console.error('[processCurrentImage] error:', err);
        alert(`处理失败: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        processingRef.current = false;
      }
    },
    [images, settings]
  );

  const processAllImages = useCallback(async () => {
    for (const image of images) {
      await processCurrentImage(image.id);
    }
  }, [images, processCurrentImage]);

  const updateTargetColors = useCallback((colors: RGBColor[]) => {
    setSettings((prev) => ({ ...prev, targetColors: colors }));
  }, []);

  const updateTolerance = useCallback((tolerance: number) => {
    setSettings((prev) => ({ ...prev, tolerance }));
  }, []);

  const toggleAutoSplit = useCallback(() => {
    setSettings((prev) => ({ ...prev, autoSplit: !prev.autoSplit }));
  }, []);

  const updateProcessingMode = useCallback((mode: ProcessingMode) => {
    setSettings((prev) => ({ ...prev, processingMode: mode }));
  }, []);

  const getSelectedOriginalUrl = useCallback((): string | null => {
    if (!selectedImageId) return null;
    const image = images.find((img) => img.id === selectedImageId);
    return image?.url ?? null;
  }, [images, selectedImageId]);

  const getSelectedProcessedImages = useCallback((): ProcessedImage[] => {
    if (!selectedImageId) return [];
    return processedImages.filter((p) => p.originalId === selectedImageId);
  }, [processedImages, selectedImageId]);

  const getSelectedCleanedUrl = useCallback((): string | null => {
    const processed = getSelectedProcessedImages();
    const cleaned = processed.find((p) => !p.isSplit);
    return cleaned?.dataUrl ?? null;
  }, [getSelectedProcessedImages]);

  const getSelectedSplitUrls = useCallback((): string[] => {
    const processed = getSelectedProcessedImages();
    return processed.filter((p) => p.isSplit).map((p) => p.dataUrl);
  }, [getSelectedProcessedImages]);

  const exportImage = useCallback(
    (dataUrl: string, filename: string) => {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    },
    []
  );

  const exportAll = useCallback(() => {
    processedImages.forEach((p) => {
      exportImage(p.dataUrl, p.name);
    });
  }, [processedImages, exportImage]);

  return {
    images,
    processedImages,
    setProcessedImages,
    selectedImageId,
    previewMode,
    settings,
    setSelectedImageId,
    setPreviewMode,
    addImages,
    removeImage,
    processCurrentImage,
    processAllImages,
    updateTargetColors,
    updateTolerance,
    toggleAutoSplit,
    updateProcessingMode,
    getSelectedOriginalUrl,
    getSelectedCleanedUrl,
    getSelectedSplitUrls,
    getSelectedProcessedImages,
    exportImage,
    exportAll,
  };
}
