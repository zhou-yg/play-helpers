import fs from 'fs';
import path from 'path';
import { TerrainDef, DecorationDef, TerrainConfig } from '@/app/lib/types';

const DATA_FILE = path.join(process.cwd(), 'server', 'data.json');

export interface DataStore {
  terrainDefs: Record<string, TerrainDef>;
  decorationDefs: Record<string, DecorationDef>;
  configs: TerrainConfig[];
}

function initData(): void {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData: DataStore = {
      terrainDefs: {},
      decorationDefs: {},
      configs: []
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
