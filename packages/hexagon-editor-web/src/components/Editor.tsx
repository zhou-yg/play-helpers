import React, { useState, useEffect, useCallback } from 'react';
import { TerrainConfig, TerrainDef, DecorationDef, Decoration, CellIndex } from '@/lib/types';
import { cellKey } from '@/lib/hex-utils';
import { DEFAULT_TERRAINS } from '@/lib/default-terrains';
import { DEFAULT_DECORATIONS } from '@/lib/default-decorations';
import { useGrid } from '@/hooks/useGrid';
import { useEditorMode, EditorMode } from '@/hooks/useEditorMode';
import LeftToolbar from './LeftToolbar';
import TopToolbar from './TopToolbar';
import HexCanvas from './HexCanvas';
import RightPanel from './RightPanel';
import ConfigDrawer from './ConfigDrawer';

export default function Editor() {
  const {
    cells,
    selected,
    setCellType,
    setCellHeight,
    addDecoration,
    removeDecoration,
    toggleCellSelection,
    clearSelection,
    selectAll,
    invertSelection,
    deleteSelected,
    addCell,
    swapCells,
    exportMapData,
    importMapData,
  } = useGrid();

  const { mode, setMode } = useEditorMode();
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [configs, setConfigs] = useState<TerrainConfig[]>([]);
  const [brushType, setBrushType] = useState('grass');
  const [hoveredCell, setHoveredCell] = useState<CellIndex | null>(null);

  const terrainDefsMap: Record<string, TerrainDef> = {};
  for (const t of DEFAULT_TERRAINS) {
    terrainDefsMap[t.id] = t;
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') setMode('select');
      else if (e.key === 'p' || e.key === 'P') setMode('paint');
      else if (e.key === 'w' || e.key === 'W') setMode('swap');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMode]);

  const handleCellHover = useCallback((indexes: CellIndex | null) => {
    setHoveredCell(indexes);
  }, []);

  const handleCellClick = useCallback(
    (indexes: [number, number], additive?: boolean) => {
      if (mode === 'paint') {
        const cell = cells.get(cellKey(indexes[0], indexes[1]));
        if (cell) {
          setCellType([indexes], brushType);
        }
      }
      toggleCellSelection(indexes, additive);
    },
    [mode, cells, brushType, setCellType, toggleCellSelection],
  );

  const handleGhostCellClick = useCallback(
    (indexes: [number, number]) => {
      addCell(indexes, brushType);
    },
    [addCell, brushType],
  );

  const handleSetTerrain = useCallback(
    (terrainId: string) => {
      setBrushType(terrainId);
      if (selected.length > 0) {
        setCellType(selected, terrainId);
      }
    },
    [selected, setCellType],
  );

  const handleSetHeight = useCallback(
    (height: number) => {
      if (selected.length > 0) {
        setCellHeight(selected, height);
      }
    },
    [selected, setCellHeight],
  );

  const handleToggleDecoration = useCallback(
    (decType: string) => {
      if (selected.length === 0) return;
      const firstCell = cells.get(cellKey(selected[0][0], selected[0][1]));
      const hasDecoration = firstCell?.decorations.some((d) => d.type === decType);
      if (hasDecoration) {
        removeDecoration(selected, decType);
      } else {
        addDecoration(selected, { type: decType });
      }
    },
    [selected, cells, addDecoration, removeDecoration],
  );

  const handleSave = useCallback(() => {
    const data = exportMapData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [exportMapData]);

  const handleLoad = useCallback(
    (jsonStr: string) => {
      try {
        const data = JSON.parse(jsonStr);
        if (data.grid && Array.isArray(data.grid)) {
          importMapData(data);
        }
      } catch (err) {
        console.error('Failed to parse map data:', err);
      }
    },
    [importMapData],
  );

  const handleSaveConfig = useCallback(
    (config: TerrainConfig) => {
      setConfigs((prev) => [...prev, config]);
    },
    [],
  );

  const handleDeleteConfig = useCallback(
    (index: number) => {
      setConfigs((prev) => prev.filter((_, i) => i !== index));
    },
    [],
  );

  return (
    <div className="editor">
      <div className="editor-left">
        <LeftToolbar mode={mode} onModeChange={setMode} />
      </div>

      <div className="editor-main">
        <div className="editor-top">
          <TopToolbar
            selected={selected}
            onSelectAll={selectAll}
            onInvertSelection={invertSelection}
            onClearSelection={clearSelection}
            onDeleteSelected={deleteSelected}
            onSave={handleSave}
            onLoad={handleLoad}
          />
        </div>
        <div className="editor-content">
          <div className="canvas-container">
            <HexCanvas
              cells={cells}
              selected={selected}
              terrainDefs={terrainDefsMap}
              mode={mode}
              onCellClick={handleCellClick}
              onCellSwap={swapCells}
              onGhostCellClick={handleGhostCellClick}
              onCellHover={handleCellHover}
            />
          </div>
        </div>
        <div className="editor-footer">
          <span>Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
          <span>Cells: {cells.size}</span>
          <span>Selected: {selected.length}</span>
          <span>坐标: {hoveredCell ? `[${hoveredCell[0]}, ${hoveredCell[1]}]` : '—'}</span>
          <span className="shortcut-hint">Shortcuts: S=Select P=Paint W=Swap</span>
        </div>
      </div>

      <div className="editor-right">
        <RightPanel
          cells={cells}
          selected={selected}
          terrainDefs={DEFAULT_TERRAINS}
          decorationDefs={DEFAULT_DECORATIONS}
          onSetTerrain={handleSetTerrain}
          onSetHeight={handleSetHeight}
          onToggleDecoration={handleToggleDecoration}
          onToggleConfig={() => setConfigDrawerOpen((v) => !v)}
        />
      </div>

      <ConfigDrawer
        isOpen={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        configs={configs}
        terrainDefs={DEFAULT_TERRAINS}
        decorationDefs={DEFAULT_DECORATIONS}
        onSave={handleSaveConfig}
        onDelete={handleDeleteConfig}
      />
    </div>
  );
}
