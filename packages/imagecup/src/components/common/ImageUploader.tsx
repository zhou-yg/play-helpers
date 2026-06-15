import React, { useCallback, useRef } from 'react';

interface ImageUploaderProps {
  onAddImages: (files: FileList | File[]) => Promise<unknown>;
  compact?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onAddImages, compact = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onAddImages(e.target.files);
        e.target.value = '';
      }
    },
    [onAddImages]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onAddImages(e.dataTransfer.files);
      }
    },
    [onAddImages]
  );

  if (compact) {
    return (
      <div className="image-thumb image-thumb-add" onClick={handleClick} title="添加图片">
        <div className="thumb-add-icon">+</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`image-uploader ${isDragOver ? 'drag-over' : ''}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div className="upload-icon">+</div>
      <div className="upload-text">点击或拖拽图片到此处上传</div>
      <div className="upload-hint">支持批量上传, PNG / JPG / WebP 等格式</div>
    </div>
  );
};
