import React, { useCallback, useState } from 'react';
import { useImageProcessing } from './hooks/useImageProcessing';
import { useProcessingPipeline } from './hooks/useProcessingPipeline';
import { Toolbar, ImagePreview, ImageUploader } from './components/common';
import { BgSettingsPanel } from './components/bg';
import { InfoPanel } from './components/info';
import { PixelToolPanel } from './components/pixel-tool';
import type { RGBColor } from './types';
import './App.css';

const App: React.FC = () => {
  const {
    images,
    processedImages,
    setProcessedImages,
    selectedImageId,
    previewMode,
    setSelectedImageId,
    setPreviewMode,
    addImages,
    removeImage,
    getSelectedOriginalUrl,
    getSelectedCleanedUrl,
    getSelectedSplitUrls,
    exportImage,
    exportAll,
  } = useImageProcessing();

  const pipeline = useProcessingPipeline();

  // 保存当前加载的图片元素引用，供 InfoPanel 使用
  const [loadedImageElement, setLoadedImageElement] = useState<HTMLImageElement | null>(null);

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    setLoadedImageElement(img);
  }, []);

  // 统一处理按钮：执行管线
  const handleProcess = useCallback(async () => {
    if (images.length === 0) return;

    const targetId = selectedImageId;
    if (!targetId) return;

    const imageFile = images.find((img) => img.id === targetId);
    if (!imageFile) return;

    const result = await pipeline.runPipeline(imageFile);

    if (result.success && result.processedImages.length > 0) {
      setProcessedImages((prev) => {
        const others = prev.filter((p) => p.originalId !== targetId);
        return [...others, ...result.processedImages];
      });

      const hasSplit = result.processedImages.some((p) => p.isSplit);
      setPreviewMode(hasSplit ? 'split' : 'cleaned');
    } else if (result.error) {
      alert(`处理失败: ${result.error}`);
    }
  }, [images, selectedImageId, pipeline, setProcessedImages, setPreviewMode]);

  // 颜色拾取 → 同步到 pipeline bgStep
  const handleColorsPick = useCallback(
    (colors: RGBColor[]) => {
      const existing = pipeline.pipelineConfig.bgStep.targetColors;
      const newColors = colors.filter(
        (c) => !existing.some((ec) => ec.r === c.r && ec.g === c.g && ec.b === c.b)
      );
      if (newColors.length > 0) {
        pipeline.updateBgStep({ targetColors: [...newColors, ...existing] });
      }
    },
    [pipeline]
  );

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
        hasImages={images.length > 0}
        processing={pipeline.processing}
        onProcess={handleProcess}
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
          <PixelToolPanel
            selectedImage={selectedImage}
            config={pipeline.pipelineConfig.pixelStep}
            onUpdate={pipeline.updatePixelStep}
            onUpdateOptions={pipeline.updatePixelOptions}
          />
          <BgSettingsPanel
            config={pipeline.pipelineConfig.bgStep}
            onUpdate={pipeline.updateBgStep}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
