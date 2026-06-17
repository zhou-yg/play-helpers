import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  imageFromFile,
  renderToCanvas,
  type RGBImage,
  type PerfectPixelOptions,
} from '@play-helpers/perfect-pixel';
import { CollapsibleSection } from '../common';
import type { ImageFile } from '../../types';
import type { PixelStepConfig } from '../../hooks/useProcessingPipeline';

type SampleMethod = 'center' | 'median' | 'majority';

/** 小问号提示组件 */
const HelpTip: React.FC<{ text: string }> = ({ text }) => (
  <span
    title={text}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      background: '#555',
      color: '#ddd',
      fontSize: '11px',
      fontWeight: 'bold',
      cursor: 'help',
      marginLeft: '4px',
      lineHeight: 1,
      flexShrink: 0,
    }}
  >
    ?
  </span>
);

interface PixelToolPanelProps {
  selectedImage: ImageFile | null;
  config: PixelStepConfig;
  onUpdate: (update: Partial<PixelStepConfig>) => void;
  onUpdateOptions: (update: Partial<PerfectPixelOptions>) => void;
}

export const PixelToolPanel: React.FC<PixelToolPanelProps> = ({
  selectedImage,
  config,
  onUpdate,
  onUpdateOptions,
}) => {
  const inputCanvasRef = useRef<HTMLCanvasElement>(null);

  // 本地 state 管理网格输入，避免输入时被清空
  const [gridWText, setGridWText] = useState('');
  const [gridHText, setGridHText] = useState('');

  // 当左侧选中图片变化时，自动加载到输入画布
  useEffect(() => {
    if (!selectedImage) return;

    let cancelled = false;

    (async () => {
      try {
        const image: RGBImage = await imageFromFile(selectedImage.file);
        if (cancelled) return;

        if (inputCanvasRef.current) {
          renderToCanvas(image, inputCanvasRef.current);
        }
      } catch (_err) {
        // ignore
      }
    })();

    return () => { cancelled = true; };
  }, [selectedImage]);

  const { options } = config;

  const handleSampleMethodChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateOptions({ sampleMethod: e.target.value as SampleMethod });
  }, [onUpdateOptions]);

  const handleRefineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateOptions({ refineIntensity: parseFloat(e.target.value) });
  }, [onUpdateOptions]);

  const handlePeakWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateOptions({ peakWidth: parseInt(e.target.value, 10) || 6 });
  }, [onUpdateOptions]);

  const handleMinSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateOptions({ minSize: parseFloat(e.target.value) || 4 });
  }, [onUpdateOptions]);

  const handleFixSquareChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateOptions({ fixSquare: e.target.checked });
  }, [onUpdateOptions]);

  const handleGridWChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGridWText(val);
    const w = val !== '' ? parseInt(val, 10) : NaN;
    const h = gridHText !== '' ? parseInt(gridHText, 10) : NaN;
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      onUpdateOptions({ gridSize: [w, h] });
    } else {
      onUpdateOptions({ gridSize: null });
    }
  }, [onUpdateOptions, gridHText]);

  const handleGridHChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGridHText(val);
    const h = val !== '' ? parseInt(val, 10) : NaN;
    const w = gridWText !== '' ? parseInt(gridWText, 10) : NaN;
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      onUpdateOptions({ gridSize: [w, h] });
    } else {
      onUpdateOptions({ gridSize: null });
    }
  }, [onUpdateOptions, gridWText]);

  return (
    <CollapsibleSection title="像素画精修" defaultExpanded={true}>
      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
          />
          启用像素画精修
        </label>
        <p className="setting-desc">
          自动检测网格尺寸，对齐边缘并采样输出像素画
        </p>
      </div>

      {selectedImage && config.enabled && (
        <div className="setting-group">
          <label>当前图片</label>
          <canvas
            ref={inputCanvasRef}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '150px',
              imageRendering: 'pixelated',
              border: '1px solid #333',
              borderRadius: '4px',
              marginTop: '4px',
            }}
          />
        </div>
      )}

      {!selectedImage && config.enabled && (
        <p style={{ fontSize: '13px', color: '#888', padding: '4px 0' }}>
          请先在左侧上传并选择图片
        </p>
      )}

      {config.enabled && (
        <>
          <div className="setting-group">
            <label>采样方法</label>
            <select
              value={options.sampleMethod}
              onChange={handleSampleMethodChange}
              style={{ width: '100%', padding: '4px 8px', marginTop: '4px' }}
            >
              <option value="center">中心点 (Center)</option>
              <option value="median">中位数 (Median)</option>
              <option value="majority">多数表决 (Majority)</option>
            </select>
            <p className="setting-desc">
              Center 最快；Median 抗噪；Majority 最强抗锯齿
            </p>
          </div>

          <div className="setting-group">
            <label style={{ display: 'inline-flex', alignItems: 'center' }}>精修强度: {(options.refineIntensity ?? 0.25).toFixed(2)}<HelpTip text="控制网格线精修时的搜索范围。值越大，网格线可在更大范围内吸附到梯度边缘，修正能力越强，但可能误吸附到错误边缘。搜索范围 = ±像素块尺寸 × 精修强度" /></label>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.05}
              value={options.refineIntensity ?? 0.25}
              onChange={handleRefineChange}
              style={{ width: '100%' }}
            />
            <div className="range-labels">
              <span>不精修</span>
              <span>强精修</span>
            </div>
          </div>

          <div className="setting-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center' }}>Peak Width:<HelpTip text="FFT 峰检测时要求峰的最小宽度。值越大只保留宽而稳定的峰，抗噪越强但可能漏检；值越小越灵敏，但易受噪声干扰产生误检" /></label>
            <input
              type="number"
              value={options.peakWidth ?? 6}
              min={2}
              max={20}
              onChange={handlePeakWidthChange}
              style={{ width: '60px', padding: '4px' }}
            />
            <label style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center' }}>Min Size:<HelpTip text="检测到的像素块最小有效尺寸（原图像素数）。若 FFT 检测出的像素块小于此值，则认为结果不可靠，自动降级到梯度后备算法重新检测" /></label>
            <input
              type="number"
              value={options.minSize ?? 4}
              min={2}
              max={20}
              onChange={handleMinSizeChange}
              style={{ width: '60px', padding: '4px' }}
            />
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={options.fixSquare ?? true}
                onChange={handleFixSquareChange}
              />
              自动修正正方形
            </label>
            <p className="setting-desc">宽高差 1 时自动对齐</p>
          </div>

          <div className="setting-group">
            <label>手动指定网格 (可选)</label>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
              <input
                type="number"
                placeholder="W"
                value={gridWText}
                onChange={handleGridWChange}
                style={{ width: '50px', padding: '4px' }}
              />
              <span>×</span>
              <input
                type="number"
                placeholder="H"
                value={gridHText}
                onChange={handleGridHChange}
                style={{ width: '50px', padding: '4px' }}
              />
            </div>
          </div>
        </>
      )}
    </CollapsibleSection>
  );
};
