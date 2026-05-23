import fs from 'fs';
import path from 'path';
import { TerrainDef, DecorationDef, TerrainConfig, MapData, GridCell } from '@/lib/types';
import { DEFAULT_TERRAINS } from './default-terrains';
import { DEFAULT_DECORATIONS } from './default-decorations';
import { generateDefaultGrid, cellKey } from './hex-utils';

const DATA_FILE = path.join(process.cwd(), 'server', 'data.json');
const MAP_DATA_FILE = path.join(process.cwd(), 'server', 'map-data.json');

export interface DataStore {
  terrainDefs: Record<string, TerrainDef>;
  decorationDefs: Record<string, DecorationDef>;
  configs: TerrainConfig[];
}

function initDefaultDefs(): { terrainDefs: Record<string, TerrainDef>; decorationDefs: Record<string, DecorationDef> } {
  const terrainDefs: Record<string, TerrainDef> = {};
  for (const t of DEFAULT_TERRAINS) {
    terrainDefs[t.id] = t;
  }
  const decorationDefs: Record<string, DecorationDef> = {};
  for (const d of DEFAULT_DECORATIONS) {
    decorationDefs[d.id] = d;
  }
  return { terrainDefs, decorationDefs };
}

function initData(): void {
  if (!fs.existsSync(DATA_FILE)) {
    const { terrainDefs, decorationDefs } = initDefaultDefs();
    const initialData: DataStore = {
      terrainDefs,
      decorationDefs,
      configs: [],
    };
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

export function readData(): DataStore {
  initData();
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  console.log('readData, file contents length:', content.length);
  return JSON.parse(content);
}

export function writeData(data: DataStore): void {
  console.log('writeData called, writing to:', DATA_FILE);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log('writeData completed');
}

export function readMapData(): MapData {
  if (!fs.existsSync(MAP_DATA_FILE)) {
    const cells = generateDefaultGrid(10, 10);
    const initialData: MapData = {
      grid: Array.from(cells.values()),
    };
    const dir = path.dirname(MAP_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MAP_DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  const content = fs.readFileSync(MAP_DATA_FILE, 'utf-8');
  return JSON.parse(content);
}

export function writeMapData(data: MapData): void {
  console.log('writeMapData called, writing to:', MAP_DATA_FILE);
  fs.writeFileSync(MAP_DATA_FILE, JSON.stringify(data, null, 2));
  console.log('writeMapData completed');
}
