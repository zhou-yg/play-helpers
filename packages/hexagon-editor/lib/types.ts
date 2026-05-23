export type CellIndex = [number, number];

export interface Decoration {
  type: string;
  position?: string;
}

export interface GridCell {
  indexes: CellIndex;
  height: number;
  type: string;
  decorations: Decoration[];
}

export interface TerrainDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  heightRange: [number, number];
}

export interface DecorationDef {
  id: string;
  name: string;
  icon: string;
}

export interface TerrainConfig {
  name: string;
  terrainType: string;
  height: number;
  heightRange: [number, number];
  decorations: string[];
}

export interface MapData {
  grid: GridCell[];
}
