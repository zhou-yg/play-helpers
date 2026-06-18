import React from 'react';
import { DecorationDef } from '@/lib/types';

interface DecorationGridProps {
  decorations: DecorationDef[];
  cellDecorations: string[];
  onToggle: (decType: string) => void;
}

export default function DecorationGrid({ decorations, cellDecorations, onToggle }: DecorationGridProps) {
  return (
    <div className="decoration-grid">
      {decorations.map((dec) => (
        <button
          key={dec.id}
          className={`decoration-btn ${cellDecorations.includes(dec.id) ? 'active' : ''}`}
          onClick={() => onToggle(dec.id)}
        >
          <span className="decoration-icon">{dec.icon}</span>
          <span className="decoration-name">{dec.name}</span>
        </button>
      ))}
    </div>
  );
}
