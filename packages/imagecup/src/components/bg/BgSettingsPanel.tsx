import React, { useState, useCallback } from 'react';
import { rgbToHex, hexToRgb } from '../../utils/colorUtils';
import { CollapsibleSection } from '../common';
import type { BgStepConfig } from '../../hooks/useProcessingPipeline';

interface BgSettingsPanelProps {
  config: BgStepConfig;
  onUpdate: (update: Partial<BgStepConfig>) => void;
}

export const BgSettingsPanel: React.FC<BgSettingsPanelProps> = ({
  config,
  onUpdate,
}) => {
  const [hexInput, setHexInput] = useState(rgbToHex(config.targetColors[0] ?? { r: 255, g: 255, b: 255 }));

  const handleAddHexColor = useCallback(() => {
    if (hexInput.length === 7 && hexInput.startsWith('#')) {
      const rgb = hexToRgb(hexInput);
      const alreadyExists = config.targetColors.some(
        (c) => c.r === rgb.r && c.g === rgb.g && c.b === rgb.b
      );
      if (alreadyExists) return;
      onUpdate({ targetColors: [rgb, ...config.targetColors] });
      setHexInput('#');
    }
  }, [hexInput, config.targetColors, onUpdate]);

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      if (!value.startsWith('#')) value = '#' + value.replace(/^#+/, '');
      setHexInput(value);
    },
    []
  );

  const handleHexKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleAddHexColor();
      }
    },
    [handleAddHexColor]
  );

  const handleClearColors = useCallback(() => {
    onUpdate({ targetColors: [{ r: 255, g: 255, b: 255 }] });
    setHexInput('#ffffff');
  }, [onUpdate]);

  const handleRemoveColor = useCallback(
    (index: number) => {
      if (config.targetColors.length <= 1) return;
      const newColors = config.targetColors.filter((_, i) => i !== index);
      onUpdate({ targetColors: newColors });
    },
    [config.targetColors, onUpdate]
  );

  const handleToleranceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ tolerance: Number(e.target.value) });
    },
    [onUpdate]
  );

  return (
    <CollapsibleSection title="背景清理" defaultExpanded={false}>
      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
          />
          启用背景清理
        </label>
        <p className="setting-desc">
          移除图片中匹配的背景颜色
        </p>
      </div>

      {config.enabled && (
        <>
          <div className="setting-group">
            <label>目标颜色</label>
            <p className="setting-desc">
              选择要移除的背景颜色（支持多个颜色混合）：<br />
              可在左侧预览图中点击选取颜色
            </p>

            <div className="color-list">
              {config.targetColors.map((color, index) => (
                <div key={index} className="color-chip-row">
                  <div
                    className="color-chip"
                    style={{ backgroundColor: rgbToHex(color) }}
                  />
                  <span className="color-value">{rgbToHex(color)}</span>
                  {config.targetColors.length > 1 && (
                    <button
                      className="color-remove"
                      onClick={() => handleRemoveColor(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="hex-input-row">
              <label>添加颜色</label>
              <div className="hex-input-wrap">
                <span className="hex-prefix">#</span>
                <input
                  type="text"
                  className="hex-input"
                  value={hexInput}
                  onChange={handleHexChange}
                  onKeyDown={handleHexKeyDown}
                  placeholder="FFFFFF"
                  maxLength={7}
                />
              </div>
              <button className="btn-add-color" onClick={handleAddHexColor}>
                添加
              </button>
            </div>

            {config.targetColors.length > 1 && (
              <button className="btn-clear-colors" onClick={handleClearColors}>
                清空全部颜色（重置为白色）
              </button>
            )}
          </div>

          <div className="setting-group">
            <label>处理模式</label>
            <p className="setting-desc">
              选择背景颜色的移除方式
            </p>
            <div className="mode-selector">
              <button
                className={`mode-btn ${config.processingMode === 'edge-to-center' ? 'active' : ''}`}
                onClick={() => onUpdate({ processingMode: 'edge-to-center' })}
              >
                <span className="mode-btn-title">边缘向中心</span>
                <span className="mode-btn-desc">从图片边缘逐步移除背景色，保护内部同色区域</span>
              </button>
              <button
                className={`mode-btn ${config.processingMode === 'global' ? 'active' : ''}`}
                onClick={() => onUpdate({ processingMode: 'global' })}
              >
                <span className="mode-btn-title">全局处理</span>
                <span className="mode-btn-desc">移除图片中所有匹配的颜色，不限位置</span>
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label>容差范围: {config.tolerance}</label>
            <p className="setting-desc">
              数值越大，匹配的颜色范围越广
            </p>
            <input
              type="range"
              className="tolerance-slider"
              min={0}
              max={100}
              value={config.tolerance}
              onChange={handleToleranceChange}
            />
            <div className="range-labels">
              <span>精确匹配</span>
              <span>宽松匹配</span>
            </div>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.autoSplit}
                onChange={() => onUpdate({ autoSplit: !config.autoSplit })}
              />
              自动拆分图片
            </label>
            <p className="setting-desc">
              根据透明区域自动将图片拆分为多个独立图片
            </p>
          </div>
        </>
      )}
    </CollapsibleSection>
  );
};
