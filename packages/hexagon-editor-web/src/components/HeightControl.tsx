import React from 'react';

interface HeightControlProps {
  height: number;
  onChange: (height: number) => void;
  disabled?: boolean;
}

const QUICK_HEIGHTS = [0, 3, 5, 7, 10];

export default function HeightControl({ height, onChange, disabled }: HeightControlProps) {
  return (
    <div>
      <div className="height-control">
        <button
          className="height-btn"
          onClick={() => onChange(height - 1)}
          disabled={disabled || height <= 0}
        >
          −
        </button>
        <input
          type="range"
          className="height-slider"
          min={0}
          max={10}
          value={height}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
        />
        <button
          className="height-btn"
          onClick={() => onChange(height + 1)}
          disabled={disabled || height >= 10}
        >
          +
        </button>
        <span style={{ minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: 'bold' }}>
          {height}
        </span>
      </div>
      <div className="height-quick-btns">
        {QUICK_HEIGHTS.map((h) => (
          <button
            key={h}
            className={`quick-height-btn ${height === h ? 'active' : ''}`}
            onClick={() => onChange(h)}
            disabled={disabled}
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}
