'use client';

import React from 'react';
import { CellIndex, GridCell, TerrainDef, DecorationDef } from '@/lib/types';
import { cellKey } from '@/lib/hex-utils';
import TerrainGrid from './TerrainGrid';
import DecorationGrid from './DecorationGrid';
import HeightControl from './HeightControl';

interface RightPanelProps {
  cells: Map<string, GridCell>;
  selected: CellIndex[];
  terrainDefs: TerrainDef[];
  decorationDefs: DecorationDef[];
  onSetTerrain: (terrainId: string) => void;
  onSetHeight: (height: number) => void;
  onToggleDecoration: (decType: string) => void;
  onToggleConfig: () => void;
}

export default function RightPanel({
  cells,
  selected,
  terrainDefs,
  decorationDefs,
  onSetTerrain,
  onSetHeight,
  onToggleDecoration,
  onToggleConfig,
}: RightPanelProps) {
  const selectedCell = selected.length === 1
    ? cells.get(cellKey(selected[0][0], selected[0][1]))
    : null;

  const selectedTerrainType = selectedCell?.type || 'grass';
  const selectedHeight = selectedCell?.height ?? 0;
  const cellDecorations = selectedCell?.decorations.map((d) => d.type) || [];

  const hasSelection = selected.length > 0;
  const isBatch = selected.length > 1;

  const previewTerrain = terrainDefs.find((t) => t.id === selectedTerrainType);

  return (
    <div className="terrain-panel">
      <div className="config-toggle">
        <button className="config-toggle-btn" onClick={onToggleConfig}>
          Config Manager
        </button>
      </div>

      <div className="terrain-section">
        <h3>Terrain</h3>
        <TerrainGrid
          terrains={terrainDefs}
          selectedType={selectedTerrainType}
          onSelect={onSetTerrain}
        />
      </div>

      <div className="terrain-section">
        <h3>Decorations</h3>
        <DecorationGrid
          decorations={decorationDefs}
          cellDecorations={cellDecorations}
          onToggle={onToggleDecoration}
        />
      </div>

      <div className="terrain-section">
        <h3>Height</h3>
        <HeightControl
          height={selectedHeight}
          onChange={onSetHeight}
          disabled={!hasSelection}
        />
      </div>

      {selectedCell && !isBatch && (
        <div className="terrain-preview">
          <div
            className="preview-hex"
            style={{ backgroundColor: previewTerrain?.color || '#7cb342' }}
          >
            <span className="preview-icon">{previewTerrain?.icon || '🌿'}</span>
            <span className="preview-height">{selectedHeight}</span>
          </div>
        </div>
      )}

      {isBatch && (
        <div className="batch-indicator">
          {selected.length} cells selected
        </div>
      )}
    </div>
  );
}
