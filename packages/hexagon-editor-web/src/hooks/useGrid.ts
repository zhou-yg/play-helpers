import { useState, useCallback, useRef } from 'react';
import { CellIndex, GridCell, Decoration, MapData } from '@/lib/types';
import { cellKey, generateDefaultGrid } from '@/lib/hex-utils';

export function useGrid() {
  const [cells, setCells] = useState<Map<string, GridCell>>(() => generateDefaultGrid(10, 10));
  const [selected, setSelected] = useState<CellIndex[]>([]);
  const cellsRef = useRef(cells);
  const selectedRef = useRef(selected);

  cellsRef.current = cells;
  selectedRef.current = selected;

  const initGrid = useCallback(() => {
    setCells(generateDefaultGrid(10, 10));
    setSelected([]);
  }, []);

  const setCellType = useCallback((indexesList: CellIndex[], type: string) => {
    setCells((prev) => {
      const next = new Map(prev);
      for (const indexes of indexesList) {
        const key = cellKey(indexes[0], indexes[1]);
        const existing = next.get(key);
        if (existing) {
          next.set(key, { ...existing, type });
        }
      }
      return next;
    });
  }, []);

  const setCellHeight = useCallback((indexesList: CellIndex[], height: number) => {
    const clamped = Math.max(0, Math.min(10, height));
    setCells((prev) => {
      const next = new Map(prev);
      for (const indexes of indexesList) {
        const key = cellKey(indexes[0], indexes[1]);
        const existing = next.get(key);
        if (existing) {
          next.set(key, { ...existing, height: clamped });
        }
      }
      return next;
    });
  }, []);

  const addDecoration = useCallback((indexesList: CellIndex[], decoration: Decoration) => {
    setCells((prev) => {
      const next = new Map(prev);
      for (const indexes of indexesList) {
        const key = cellKey(indexes[0], indexes[1]);
        const existing = next.get(key);
        if (existing) {
          const hasDec = existing.decorations.some((d) => d.type === decoration.type);
          if (!hasDec) {
            next.set(key, {
              ...existing,
              decorations: [...existing.decorations, decoration],
            });
          }
        }
      }
      return next;
    });
  }, []);

  const removeDecoration = useCallback((indexesList: CellIndex[], decType: string) => {
    setCells((prev) => {
      const next = new Map(prev);
      for (const indexes of indexesList) {
        const key = cellKey(indexes[0], indexes[1]);
        const existing = next.get(key);
        if (existing) {
          next.set(key, {
            ...existing,
            decorations: existing.decorations.filter((d) => d.type !== decType),
          });
        }
      }
      return next;
    });
  }, []);

  const toggleCellSelection = useCallback((indexes: CellIndex, additive?: boolean) => {
    setSelected((prev) => {
      const key = cellKey(indexes[0], indexes[1]);
      const isSelected = prev.some(([sx, sy]) => sx === indexes[0] && sy === indexes[1]);

      if (additive) {
        if (isSelected) {
          return prev.filter(([sx, sy]) => !(sx === indexes[0] && sy === indexes[1]));
        }
        return [...prev, [indexes[0], indexes[1]]];
      }

      if (isSelected && prev.length === 1) {
        return [];
      }
      return [[indexes[0], indexes[1]]];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  const selectAll = useCallback(() => {
    const currentCells = cellsRef.current;
    const all: CellIndex[] = [];
    for (const cell of currentCells.values()) {
      all.push([cell.indexes[0], cell.indexes[1]]);
    }
    setSelected(all);
  }, []);

  const selectCells = useCallback((indexesList: CellIndex[]) => {
    setSelected(indexesList.map(([x, y]) => [x, y] as CellIndex));
  }, []);

  const invertSelection = useCallback(() => {
    const currentCells = cellsRef.current;
    const currentSelected = selectedRef.current;
    const all: CellIndex[] = [];
    for (const cell of currentCells.values()) {
      all.push([cell.indexes[0], cell.indexes[1]]);
    }
    const selectedKeys = new Set(currentSelected.map(([x, y]) => cellKey(x, y)));
    const inverted = all.filter(([x, y]) => !selectedKeys.has(cellKey(x, y)));
    setSelected(inverted);
  }, []);

  const deleteSelected = useCallback(() => {
    const currentSelected = selectedRef.current;
    if (currentSelected.length === 0) return;

    setCells((prev) => {
      const next = new Map(prev);
      for (let i = 0; i < currentSelected.length; i++) {
        const [sx, sy] = currentSelected[i];
        next.delete(cellKey(sx, sy));
      }
      return next;
    });
    setSelected([]);
  }, []);

  const addCell = useCallback((indexes: CellIndex, type: string) => {
    setCells((prev) => {
      const key = cellKey(indexes[0], indexes[1]);
      if (prev.has(key)) return prev;
      const next = new Map(prev);
      next.set(key, {
        indexes: [indexes[0], indexes[1]],
        height: 0,
        type,
        decorations: [],
      });
      return next;
    });
    setSelected([[indexes[0], indexes[1]]]);
  }, []);

  const swapCells = useCallback((from: CellIndex, to: CellIndex) => {
    setCells((prev) => {
      const next = new Map(prev);
      const fromKey = cellKey(from[0], from[1]);
      const toKey = cellKey(to[0], to[1]);
      const fromCell = next.get(fromKey);
      const toCell = next.get(toKey);

      if (fromCell && toCell) {
        next.set(fromKey, { ...toCell, indexes: fromCell.indexes });
        next.set(toKey, { ...fromCell, indexes: toCell.indexes });
      }

      return next;
    });
  }, []);

  const exportMapData = useCallback((): MapData => {
    const currentCells = cellsRef.current;
    return { grid: Array.from(currentCells.values()) };
  }, []);

  const importMapData = useCallback((data: MapData) => {
    const newCells = new Map<string, GridCell>();
    for (const cell of data.grid) {
      newCells.set(cellKey(cell.indexes[0], cell.indexes[1]), cell);
    }
    setCells(newCells);
    setSelected([]);
  }, []);

  return {
    cells,
    selected,
    initGrid,
    setCellType,
    setCellHeight,
    addDecoration,
    removeDecoration,
    toggleCellSelection,
    clearSelection,
    selectCells,
    selectAll,
    invertSelection,
    deleteSelected,
    addCell,
    swapCells,
    exportMapData,
    importMapData,
  };
}
