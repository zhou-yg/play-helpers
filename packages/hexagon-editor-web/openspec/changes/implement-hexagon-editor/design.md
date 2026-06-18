# Design: Hexagon Editor Web Application

## Architecture Overview

Next.js 14 App Router application. All editor logic runs client-side (`'use client'`). File-based persistence uses Next.js API routes backed by `lib/data.ts`.

```
app/
  layout.tsx              → Root layout (already exists)
  page.tsx                → Main editor page ('use client')
  globals.css             → All styles (already exists, no changes needed)
  api/
    map/
      route.ts            → GET/POST for loading and saving map JSON
lib/
  types.ts                → TypeScript type definitions (new)
  data.ts                 → File-based JSON persistence (exists, fix imports)
  hex-utils.ts            → Hex grid math utilities (axial coords, neighbors, etc.)
  default-terrains.ts     → Default terrain definitions (new)
  default-decorations.ts  → Default decoration definitions (new)
components/
  Editor.tsx              → Top-level editor layout (left bar + main + right panel)
  HexCanvas.tsx           → SVG hex grid rendering + interaction
  LeftToolbar.tsx         → Mode selection (select, paint, swap)
  TopToolbar.tsx          → Presets, selection actions, save/load
  RightPanel.tsx          → Terrain panel + height control + decorations
  TerrainGrid.tsx         → Terrain type selection buttons
  DecorationGrid.tsx      → Decoration placement buttons
  HeightControl.tsx       → Height slider (0-10) with quick presets
  ConfigDrawer.tsx        → Slide-out drawer for terrain config management
hooks/
  useGrid.ts              → Grid state: cells, selection, mutations
  useEditorMode.ts        → Current edit mode (select / paint / swap)
server/
  data.json               → Persistent terrain/decoration/config data (exists)
```

## Data Model

### Core Types (`lib/types.ts`)

```typescript
type CellIndex = [number, number]; // [x, y] axial coordinates

interface GridCell {
  indexes: CellIndex;
  height: number;        // 0-10
  type: string;          // terrain type id (e.g. "grass")
  decorations: Decoration[]; // decorations on this cell
}

interface Decoration {
  type: string;          // decoration type id (e.g. "rock")
  position?: string;     // optional position hint
}

interface TerrainDef {
  id: string;
  name: string;
  icon: string;          // emoji
  color: string;         // hex color
  heightRange: [number, number];
}

interface DecorationDef {
  id: string;
  name: string;
  icon: string;          // emoji
}

interface TerrainConfig {
  name: string;
  terrainType: string;
  height: number;
  heightRange: [number, number];
  decorations: string[];
}

interface MapData {
  grid: GridCell[];
}
```

### Default Data

**Terrain types** (id, name, icon, color, heightRange):
- grass: 草, 🌿, #7cb342, [0, 4]
- water: 水, 💧, #4287f5, [0, 2]
- mountain: 山, ⛰️, #8d6e63, [5, 10]
- forest: 林, 🌲, #2e7d32, [2, 8]
- sand: 沙, 🏖️, #f9a825, [0, 3]
- stone: 石, 🪨, #757575, [3, 10]

**Decoration types** (id, name, icon):
- rock: 岩石, 🪨
- tree: 树木, 🌳
- water: 水域, 💦
- flower: 花朵, 🌸

## Component Design

### Editor (`components/Editor.tsx`)
- Top-level layout: flex row with LeftToolbar (50px), main area (flex-1), RightPanel (220px)
- Holds grid state via `useGrid` hook
- Passes state down to child components

### HexCanvas (`components/HexCanvas.tsx`)
- Renders 10×10 hex grid as SVG
- Each hex is a `<polygon>` inside a `<g>` wrapper with CSS class `.hexagon`
- Click to select, drag to swap (in swap mode)
- Visual states: default, hover (brightness +), selected (brighter), dragging (opacity 0.7), valid-target (green stroke)
- Renders terrain icon + height label inside each hex
- Hex layout: flat-top orientation, using axial coordinate math

### LeftToolbar (`components/LeftToolbar.tsx`)
- Vertical button stack: Select (S), Paint (P), Swap (W)
- Active mode highlighted
- Emits mode change events

### TopToolbar (`components/TopToolbar.tsx`)
- Presets: Quick-apply preset terrain configs to selected cells
- Selection: Select All, Invert, Clear
- Actions: Save (JSON download), Load (JSON file upload), Delete Cells

### RightPanel (`components/RightPanel.tsx`)
- Contains: TerrainGrid, DecorationGrid, HeightControl
- Shows terrain preview of selected cell
- Shows batch indicator when multiple cells selected
- Config drawer toggle button

### HeightControl (`components/HeightControl.tsx`)
- Slider input (0-10) with +/- buttons
- Quick preset buttons: 0, 3, 5, 7, 10
- Shows current height value
- Disabled when no cell selected

### ConfigDrawer (`components/ConfigDrawer.tsx`)
- Slide-out overlay from right side
- List saved terrain configs with edit/delete
- Add new config form: name, terrain type, height range, decoration toggles
- Save/cancel editing

## State Management

No external state library. Use React hooks:

```
useGrid() → {
  cells: Map<string, GridCell>,   // key = "x,y"
  selected: CellIndex[],
  initGrid(): void,               // initialize 10×10 empty grid
  setCellType(indexes, type): void,
  setCellHeight(indexes, height): void,
  addDecoration(indexes, dec): void,
  removeDecoration(indexes, decType): void,
  selectCell(indexes, additive?): void,
  clearSelection(): void,
  selectAll(): void,
  swapCells(from, to): void,
  exportJSON(): MapData,
  importJSON(data: MapData): void,
}

useEditorMode() → {
  mode: 'select' | 'paint' | 'swap',
  setMode(mode): void,
}
```

**State ownership**: `Editor` component holds both hooks, passes down to children.

## Hex Grid Math (`lib/hex-utils.ts`)

Flat-top hexagon geometry:
- Width = 2 * size, Height = sqrt(3) * size
- Hex center from axial (q, r): x = size * (3/2 * q), y = size * (sqrt(3)/2 * q + sqrt(3) * r)
- Polygon points from center: 6 vertices at 60° intervals, starting at 0°
- Neighbor offsets: [+1,0], [+1,-1], [0,-1], [-1,0], [-1,+1], [0,+1]

Grid dimensions: 10 columns × 10 rows, axial coordinates (0,0) to (9,9).

## Data Flow

```
Load: API GET /api/map → readData() → MapData → initGrid()
Save: exportJSON() → API POST /api/map → writeData() → server/data.json
Config: API GET/POST /api/config for terrain/decoration defs and configs
```

## Reusing Existing CSS

The `globals.css` file is already complete. All new components MUST use the exact CSS class names already defined so no CSS changes are needed. Key classes: `.editor`, `.editor-left`, `.editor-main`, `.editor-top`, `.toolbar`, `.canvas-container`, `.hex-canvas`, `.editor-right`, `.terrain-panel`, `.terrain-grid`, `.terrain-btn`, `.decoration-grid`, `.decoration-btn`, `.height-slider`, `.height-control`, `.quick-height-btn`, `.config-drawer`, `.hexagon`, `.config-editor`, etc.
