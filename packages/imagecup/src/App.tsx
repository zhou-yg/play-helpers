import React, { useCallback } from 'react';
import { useImageProcessing } from './hooks/useImageProcessing';
import { Toolbar } from './components/Toolbar';
import { ImagePreview } from './components/ImagePreview';
import { SettingsPanel } from './components/SettingsPanel';
import { ImageUploader } from './components/ImageUploader';
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
    getSelectedOriginalUrl,
    getSelectedCleanedUrl,
    getSelectedSplitUrls,
    exportImage,
    exportAll,
  } = useImageProcessing();

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

  const hasProcessed = processedImages.length > 0;
  const originalUrl = getSelectedOriginalUrl();
  const cleanedUrl = getSelectedCleanedUrl();
  const splitUrls = getSelectedSplitUrls();

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
          />
        </div>

        <div className="right-panel">
          <SettingsPanel
            targetColors={settings.targetColors}
            tolerance={settings.tolerance}
            autoSplit={settings.autoSplit}
            onTargetColorsChange={updateTargetColors}
            onToleranceChange={updateTolerance}
            onAutoSplitToggle={toggleAutoSplit}
            onProcess={handleProcess}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
