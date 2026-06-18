import { TerrainDef } from './types';

export const DEFAULT_TERRAINS: TerrainDef[] = [
  {
    id: 'grass',
    name: '草',
    icon: '🌿',
    color: '#7cb342',
    heightRange: [0, 4],
  },
  {
    id: 'water',
    name: '水',
    icon: '💧',
    color: '#4287f5',
    heightRange: [0, 2],
  },
  {
    id: 'mountain',
    name: '山',
    icon: '⛰️',
    color: '#8d6e63',
    heightRange: [5, 10],
  },
  {
    id: 'forest',
    name: '林',
    icon: '🌲',
    color: '#2e7d32',
    heightRange: [2, 8],
  },
  {
    id: 'sand',
    name: '沙',
    icon: '🏖️',
    color: '#f9a825',
    heightRange: [0, 3],
  },
  {
    id: 'stone',
    name: '石',
    icon: '🪨',
    color: '#757575',
    heightRange: [3, 10],
  },
];
