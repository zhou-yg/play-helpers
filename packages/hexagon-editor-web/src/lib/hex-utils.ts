import { CellIndex, GridCell } from './types';

export const HEX_SIZE = 40;

export const NEIGHBOR_OFFSETS: CellIndex[] = [
  [+1, 0],
  [+1, -1],
  [0, -1],
  [-1, 0],
  [-1, +1],
  [0, +1],

  [+2, 0],
  [+2, -1],
  [+2, -2],
  [+1, +1],
  [+1, -2],
  [0, +2],
  [0, -2],
  [-1, +2],
  [-1, -1],
  [-2, +2],
  [-2, +1],
  [-2, 0],

  [+3, 0],
  [+3, -1],
  [+3, -2],
  [+3, -3],
  [+2, +1],
  [+2, -3],
  [+1, +2],
  [+1, -3],
  [0, +3],
  [0, -3],
  [-1, +3],
  [-1, -2],
  [-2, +3],
  [-2, -1],
  [-3, +3],
  [-3, +2],
  [-3, +1],
  [-3, 0],
];

export function hexCenter(x: number, y: number): [number, number] {
  const cx = HEX_SIZE * (3 / 2) * x;
  const cy = HEX_SIZE * ((Math.sqrt(3) / 2) * x + Math.sqrt(3) * y);
  return [cx, cy];
}

export function hexVertices(cx: number, cy: number): [number, number][] {
  const vertices: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    vertices.push([
      cx + HEX_SIZE * Math.cos(angle),
      cy + HEX_SIZE * Math.sin(angle),
    ]);
  }
  return vertices;
}

export function hexPoints(cx: number, cy: number): string {
  return hexVertices(cx, cy).map(([px, py]) => `${px},${py}`).join(' ');
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function generateDefaultGrid(rows: number = 10, cols: number = 10): Map<string, GridCell> {
  const cells = new Map<string, GridCell>();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell: GridCell = {
        indexes: [x, y],
        height: 0,
        type: 'grass',
        decorations: [],
      };
      cells.set(cellKey(x, y), cell);
    }
  }
  return cells;
}

export function getGridBounds(cells: Map<string, GridCell>): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const cell of cells.values()) {
    const [x, y] = cell.indexes;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function getGhostCells(cells: Map<string, GridCell>): CellIndex[] {
  const ghostSet = new Set<string>();
  const existingKeys = new Set(cells.keys());

  for (const cell of cells.values()) {
    const [x, y] = cell.indexes;
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
      const nx = x + dx;
      const ny = y + dy;
      const nKey = cellKey(nx, ny);
      if (!existingKeys.has(nKey)) {
        ghostSet.add(nKey);
      }
    }
  }

  return Array.from(ghostSet).map((key): CellIndex => {
    const [x, y] = key.split(',').map(Number);
    return [x, y];
  });
}

export function getSvgViewBox(
  cells: Map<string, GridCell>,
  ghostCells: CellIndex[],
): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const update = (cx: number, cy: number) => {
    if (cx - HEX_SIZE < minX) minX = cx - HEX_SIZE;
    if (cy - HEX_SIZE < minY) minY = cy - HEX_SIZE;
    if (cx + HEX_SIZE > maxX) maxX = cx + HEX_SIZE;
    if (cy + HEX_SIZE > maxY) maxY = cy + HEX_SIZE;
  };

  for (const cell of cells.values()) {
    const [cx, cy] = hexCenter(cell.indexes[0], cell.indexes[1]);
    update(cx, cy);
  }
  for (const [gx, gy] of ghostCells) {
    const [cx, cy] = hexCenter(gx, gy);
    update(cx, cy);
  }

  const pad = 20;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  return `${minX - pad} ${minY - pad} ${w} ${h}`;
}
