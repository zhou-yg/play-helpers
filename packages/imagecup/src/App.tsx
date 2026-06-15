import React, { useCallback, useState } from 'react';
import { useImageProcessing } from './hooks/useImageProcessing';
import { Toolbar, ImagePreview, ImageUploader } from './components/common';
import { BgSettingsPanel } from './components/bg';
import { InfoPanel } from './components/info';
import type { RGBColor } from './types';
import './App.css';

const App: React.FC = () => {
  const {
    images,
    processedImages,
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
    exportImage,
    exportAll,
  } = useImageProcessing();

  // 保存当前加载的图片元素引用，供 InfoPanel 使用
  const [loadedImageElement, setLoadedImageElement] = useState<HTMLImageElement | null>(null);

  const handleProcess = useCallback(() => {
    if (images.length === 0) return;
    if (selectedImageId) {
      processCurrentImage(selectedImageId);
    } else {
      processAllImages();
    }
  }, [images, selectedImageId, processCurrentImage, processAllImages]);

  const handleColorsPick = useCallback(
    (colors: RGBColor[]) => {
      const existing = settings.targetColors;
      const newColors = colors.filter(
        (c) => !existing.some((ec) => ec.r === c.r && ec.g === c.g && ec.b === c.b)
      );
      if (newColors.length > 0) {
        updateTargetColors([...newColors, ...existing]);
      }
    },
    [settings.targetColors, updateTargetColors]
  );

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    setLoadedImageElement(img);
  }, []);

  const hasProcessed = processedImages.length > 0;
  const originalUrl = getSelectedOriginalUrl();
  const cleanedUrl = getSelectedCleanedUrl();
  const splitUrls = getSelectedSplitUrls();

  const selectedImage = images.find((img) => img.id === selectedImageId) ?? null;

  return (
    <div className="app">
      <Toolbar
        processedImages={processedImages}
        onExportAll={exportAll}
        onExportImage={exportImage}
        hasProcessedImages={hasProcessed}
      />

      <div className="main-content">
        <div className="left-panel">
          {images.length === 0 && <ImageUploader onAddImages={addImages} />}
          <ImagePreview
            images={images}
            selectedImageId={selectedImageId}
            previewMode={previewMode}
            originalUrl={originalUrl}
            cleanedUrl={cleanedUrl}
            splitUrls={splitUrls}
            processedImages={processedImages}
            onSelectImage={setSelectedImageId}
            onRemoveImage={removeImage}
            onPreviewModeChange={setPreviewMode}
            onColorsPick={handleColorsPick}
            onAddImages={addImages}
            onImageLoad={handleImageLoad}
          />
        </div>

        <div className="right-panel">
          <InfoPanel
            image={selectedImage}
            imageElement={loadedImageElement}
          />
          <BgSettingsPanel
            targetColors={settings.targetColors}
            tolerance={settings.tolerance}
            autoSplit={settings.autoSplit}
            processingMode={settings.processingMode}
            onTargetColorsChange={updateTargetColors}
            onToleranceChange={updateTolerance}
            onAutoSplitToggle={toggleAutoSplit}
            onProcessingModeChange={updateProcessingMode}
            onProcess={handleProcess}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
