import React from 'react';
import { CellIndex } from '@/lib/types';

interface TopToolbarProps {
  selected: CellIndex[];
  onSelectAll: () => void;
  onInvertSelection: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onSave: () => void;
  onLoad: (data: string) => void;
}

export default function TopToolbar({
  selected,
  onSelectAll,
  onInvertSelection,
  onClearSelection,
  onDeleteSelected,
  onSave,
  onLoad,
}: TopToolbarProps) {
  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          if (content) {
            onLoad(content);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const hasSelection = selected.length > 0;

  return (
    <div className="toolbar">
      <div className="selection-buttons">
        <button onClick={onSelectAll}>Select All</button>
        <button onClick={onInvertSelection}>Invert</button>
        <button onClick={onClearSelection} disabled={!hasSelection}>
          Clear
        </button>
      </div>
      <div className="toolbar-actions">
        <button onClick={onDeleteSelected} className={hasSelection ? 'danger' : ''} disabled={!hasSelection}>
          Delete
        </button>
        <button onClick={onSave}>Save</button>
        <button onClick={handleLoad}>Load</button>
      </div>
    </div>
  );
}
