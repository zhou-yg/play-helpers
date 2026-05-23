import React from 'react';
import { TerrainDef } from '@/lib/types';

interface TerrainGridProps {
  terrains: TerrainDef[];
  selectedType: string;
  onSelect: (terrainId: string) => void;
}

export default function TerrainGrid({ terrains, selectedType, onSelect }: TerrainGridProps) {
  return (
    <div className="terrain-grid">
      {terrains.map((terrain) => (
        <button
          key={terrain.id}
          className={`terrain-btn ${selectedType === terrain.id ? 'active' : ''}`}
          onClick={() => onSelect(terrain.id)}
        >
          <span className="terrain-icon">{terrain.icon}</span>
          <span className="terrain-name">{terrain.name}</span>
        </button>
      ))}
    </div>
  );
}
