import React, { useRef, useCallback, useMemo } from 'react';
import { GridCell, CellIndex, TerrainDef } from '@/lib/types';
import { hexCenter, hexPoints, cellKey, getGhostCells, getSvgViewBox, HEX_SIZE } from '@/lib/hex-utils';
import { EditorMode } from '@/hooks/useEditorMode';

interface HexCanvasProps {
  cells: Map<string, GridCell>;
  selected: CellIndex[];
  terrainDefs: Record<string, TerrainDef>;
  mode: EditorMode;
  onCellClick: (indexes: CellIndex, additive?: boolean) => void;
  onCellSwap: (from: CellIndex, to: CellIndex) => void;
  onGhostCellClick?: (indexes: CellIndex) => void;
  onCellHover?: (indexes: CellIndex | null) => void;
}

export default function HexCanvas({
  cells,
  selected,
  terrainDefs,
  mode,
  onCellClick,
  onCellSwap,
  onGhostCellClick,
  onCellHover,
}: HexCanvasProps) {
  const dragFrom = useRef<CellIndex | null>(null);

  const handleClick = useCallback(
    (indexes: CellIndex, e: React.MouseEvent) => {
      if (mode === 'swap') {
        if (!dragFrom.current) {
          dragFrom.current = [indexes[0], indexes[1]];
        } else {
          onCellSwap(dragFrom.current, [indexes[0], indexes[1]]);
          dragFrom.current = null;
        }
      } else if (mode === 'paint' || mode === 'select') {
        onCellClick([indexes[0], indexes[1]], e.metaKey || e.ctrlKey);
      }
    },
    [mode, onCellClick, onCellSwap],
  );

  const sortedCells = Array.from(cells.values()).sort((a, b) => {
    if (a.indexes[1] !== b.indexes[1]) return a.indexes[1] - b.indexes[1];
    return a.indexes[0] - b.indexes[0];
  });

  const ghostCells = useMemo<CellIndex[]>(() => {
    if (mode !== 'paint') return [];
    return getGhostCells(cells);
  }, [cells, mode]);

  const viewBox = useMemo(() => {
    return getSvgViewBox(cells, ghostCells);
  }, [cells, ghostCells]);

  const axisData = useMemo(() => {
    const qSet = new Set<number>();
    const rSet = new Set<number>();
    for (const cell of cells.values()) {
      qSet.add(cell.indexes[0]);
      rSet.add(cell.indexes[1]);
    }
    const qValues = Array.from(qSet).sort((a, b) => a - b);
    const rValues = Array.from(rSet).sort((a, b) => a - b);

    const qMin = qValues[0] ?? 0;
    const qMax = qValues[qValues.length - 1] ?? 0;
    const rMin = rValues[0] ?? 0;
    const rMax = rValues[rValues.length - 1] ?? 0;

    const rowLines: { points: string }[] = [];
    for (let r = rMin; r <= rMax; r++) {
      let hasRow = false;
      for (let q = qMin; q <= qMax; q++) {
        if (cells.has(cellKey(q, r))) hasRow = true;
      }
      if (!hasRow) continue;
      const pts: string[] = [];
      for (let q = qMin; q <= qMax; q++) {
        if (cells.has(cellKey(q, r))) {
          const [cx, cy] = hexCenter(q, r);
          pts.push(`${cx},${cy}`);
        }
      }
      if (pts.length > 1) {
        rowLines.push({ points: pts.join(' ') });
      }
    }

    const colLines: { points: string }[] = [];
    for (let q = qMin; q <= qMax; q++) {
      let hasCol = false;
      for (let r = rMin; r <= rMax; r++) {
        if (cells.has(cellKey(q, r))) hasCol = true;
      }
      if (!hasCol) continue;
      const pts: string[] = [];
      for (let r = rMin; r <= rMax; r++) {
        if (cells.has(cellKey(q, r))) {
          const [cx, cy] = hexCenter(q, r);
          pts.push(`${cx},${cy}`);
        }
      }
      if (pts.length > 1) {
        colLines.push({ points: pts.join(' ') });
      }
    }

    const qLabels: { cx: number; cy: number; label: string }[] = [];
    for (const q of qValues) {
      let topR = Infinity;
      for (const cell of cells.values()) {
        if (cell.indexes[0] === q && cell.indexes[1] < topR) {
          topR = cell.indexes[1];
        }
      }
      if (topR !== Infinity) {
        const [cx, cy] = hexCenter(q, topR);
        qLabels.push({ cx, cy: cy - HEX_SIZE - 14, label: `q=${q}` });
      }
    }

    const rLabels: { cx: number; cy: number; label: string }[] = [];
    for (const r of rValues) {
      let leftQ = Infinity;
      for (const cell of cells.values()) {
        if (cell.indexes[1] === r && cell.indexes[0] < leftQ) {
          leftQ = cell.indexes[0];
        }
      }
      if (leftQ !== Infinity) {
        const [cx, cy] = hexCenter(leftQ, r);
        rLabels.push({ cx: cx - HEX_SIZE - 10, cy, label: `r=${r}` });
      }
    }

    return { rowLines, colLines, qLabels, rLabels };
  }, [cells]);

  const selectedKeys = new Set(selected.map(([x, y]) => cellKey(x, y)));
  const dragFromKey = dragFrom.current ? cellKey(dragFrom.current[0], dragFrom.current[1]) : null;

  const renderHex = (
    cx: number,
    cy: number,
    fillColor: string,
    stroke: string,
    strokeWidth: number,
    icon: string,
    height: number,
    decIcons: string,
    extraClass: string,
    onClick?: (e: React.MouseEvent) => void,
    onMouseEnter?: () => void,
    onMouseLeave?: () => void,
  ) => (
    <g
      className={`hexagon ${extraClass}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      <polygon
        points={hexPoints(cx, cy)}
        fill={fillColor}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={extraClass === 'ghost' ? 0.25 : 1}
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={16}
        style={{ pointerEvents: 'none', opacity: extraClass === 'ghost' ? 0.4 : 1 }}
      >
        {icon}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fill="#fff"
        style={{ pointerEvents: 'none', opacity: extraClass === 'ghost' ? 0.4 : 1 }}
      >
        {height > 0 ? height : ''}
      </text>
      {decIcons && (
        <text
          x={cx + 16}
          y={cy - 14}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          style={{ pointerEvents: 'none', opacity: extraClass === 'ghost' ? 0.4 : 1 }}
        >
          {decIcons}
        </text>
      )}
    </g>
  );

  return (
    <svg
      className="hex-canvas"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      <g className="axis-grid" style={{ pointerEvents: 'none' }}>
        {axisData.rowLines.map((line, i) => (
          <polyline key={`row-${i}`} points={line.points} fill="none" stroke="#2a2a4e" strokeWidth={1} />
        ))}
        {axisData.colLines.map((line, i) => (
          <polyline key={`col-${i}`} points={line.points} fill="none" stroke="#2a2a4e" strokeWidth={1} />
        ))}
      </g>

      <g className="axis-labels" style={{ pointerEvents: 'none' }}>
        {axisData.qLabels.map((l, i) => (
          <text
            key={`ql-${i}`}
            x={l.cx}
            y={l.cy}
            textAnchor="middle"
            dominantBaseline="auto"
            fontSize={12}
            fill="#555"
          >
            {l.label}
          </text>
        ))}
        {axisData.rLabels.map((l, i) => (
          <text
            key={`rl-${i}`}
            x={l.cx}
            y={l.cy}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={12}
            fill="#555"
          >
            {l.label}
          </text>
        ))}
      </g>

      {mode === 'paint' && ghostCells.map(([gx, gy]) => {
        const [cx, cy] = hexCenter(gx, gy);
        return renderHex(
          cx, cy,
          '#2a2a4e',
          '#4a4a7e',
          1,
          '+',
          0,
          '',
          'ghost',
          () => onGhostCellClick?.([gx, gy]),
          () => onCellHover?.([gx, gy]),
          () => onCellHover?.(null),
        );
      })}

      {sortedCells.map((cell) => {
        const [cx, cy] = hexCenter(cell.indexes[0], cell.indexes[1]);
        const key = cellKey(cell.indexes[0], cell.indexes[1]);
        const isSelected = selectedKeys.has(key);
        const isDragging = dragFromKey === key;
        const terrain = terrainDefs[cell.type];
        const fillColor = terrain?.color || '#7cb342';

        const extraClass = [
          isSelected ? 'selected' : '',
          isDragging ? 'dragging' : '',
        ].filter(Boolean).join(' ');

        const decIcons = cell.decorations.map((d) => {
          const def = terrainDefs[d.type];
          return def?.icon || '●';
        }).join('');

        return (
          <g key={key}>
            {renderHex(
              cx, cy,
              fillColor,
              isSelected ? '#6a6aae' : '#3a3a5e',
              isSelected ? 3 : 1,
              terrain?.icon || '',
              cell.height,
              decIcons,
              extraClass,
              (e) => handleClick(cell.indexes, e),
              () => onCellHover?.([cell.indexes[0], cell.indexes[1]]),
              () => onCellHover?.(null),
            )}
          </g>
        );
      })}
    </svg>
  );
}
