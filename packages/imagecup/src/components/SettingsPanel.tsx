import React, { useState, useCallback } from 'react';
import type { RGBColor } from '../types';
import { rgbToHex, hexToRgb } from '../utils/colorUtils';

interface SettingsPanelProps {
  targetColors: RGBColor[];
  tolerance: number;
  autoSplit: boolean;
  onTargetColorsChange: (colors: RGBColor[]) => void;
  onToleranceChange: (tolerance: number) => void;
  onAutoSplitToggle: () => void;
  onProcess: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  targetColors,
  tolerance,
  autoSplit,
  onTargetColorsChange,
  onToleranceChange,
  onAutoSplitToggle,
  onProcess,
}) => {
  const [hexInput, setHexInput] = useState(rgbToHex(targetColors[0] ?? { r: 255, g: 255, b: 255 }));

  const handleAddHexColor = useCallback(() => {
    if (hexInput.length === 7 && hexInput.startsWith('#')) {
      const rgb = hexToRgb(hexInput);
      const alreadyExists = targetColors.some(
        (c) => c.r === rgb.r && c.g === rgb.g && c.b === rgb.b
      );
      if (alreadyExists) return;
      onTargetColorsChange([rgb, ...targetColors]);
      setHexInput('#');
    }
  }, [hexInput, targetColors, onTargetColorsChange]);

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
    onTargetColorsChange([{ r: 255, g: 255, b: 255 }]);
    setHexInput('#ffffff');
  }, [onTargetColorsChange]);

  const handleRemoveColor = useCallback(
    (index: number) => {
      if (targetColors.length <= 1) return;
      const newColors = targetColors.filter((_, i) => i !== index);
      onTargetColorsChange(newColors);
    },
    [targetColors, onTargetColorsChange]
  );

  const handleToleranceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onToleranceChange(Number(e.target.value));
    },
    [onToleranceChange]
  );

  return (
    <div className="settings-panel">
      <h3>清理设置</h3>

      <div className="setting-group">
        <label>目标颜色</label>
        <p className="setting-desc">
          选择要移除的背景颜色（支持多个颜色混合）：<br />
          可在左侧预览图中点击选取颜色
        </p>

        <div className="color-list">
          {targetColors.map((color, index) => (
            <div key={index} className="color-chip-row">
              <div
                className="color-chip"
                style={{ backgroundColor: rgbToHex(color) }}
              />
              <span className="color-value">{rgbToHex(color)}</span>
              {targetColors.length > 1 && (
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

        {targetColors.length > 1 && (
          <button className="btn-clear-colors" onClick={handleClearColors}>
            清空全部颜色（重置为白色）
          </button>
        )}
      </div>

      <div className="setting-group">
        <label>容差范围: {tolerance}</label>
        <p className="setting-desc">
          数值越大，匹配的颜色范围越广
        </p>
        <input
          type="range"
          className="tolerance-slider"
          min={0}
          max={100}
          value={tolerance}
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
            checked={autoSplit}
            onChange={onAutoSplitToggle}
          />
          自动拆分图片
        </label>
        <p className="setting-desc">
          根据透明区域自动将图片拆分为多个独立图片
        </p>
      </div>

      <button className="btn-process" onClick={onProcess}>
        处理图片
      </button>
    </div>
  );
};
