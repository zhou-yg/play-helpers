# Tasks: Implement Hexagon Editor Web Application

## Phase 1: Foundation

- [x] **1.1 Create type definitions** (`lib/types.ts`)
  - Define `CellIndex`, `GridCell`, `Decoration`, `TerrainDef`, `DecorationDef`, `TerrainConfig`, `MapData`
  - Export all types from a single module

- [x] **1.2 Create default data files**
  - `lib/default-terrains.ts`: 6 terrain definitions (grass, water, mountain, forest, sand, stone)
  - `lib/default-decorations.ts`: 4 decoration definitions (rock, tree, water, flower)

- [x] **1.3 Create hex grid math utilities** (`lib/hex-utils.ts`)
  - Hex center-to-polygon vertex conversion (flat-top orientation)
  - Axial coordinate helpers: neighbor offsets
  - Grid cell key helper: `cellKey(x, y)` = `"x,y"`
  - Placeholder grid generator (10×10 empty cells with default type "grass", height 0)

- [x] **1.4 Fix and update `lib/data.ts`**
  - Fix unresolved imports by replacing `@/app/lib/types` with `@/lib/types`
  - Add seed/init function for default terrain/decoration definitions
  - Add dedicated read/write functions for map grid data alongside existing terrain config data

## Phase 2: State Management

- [x] **2.1 Implement `useEditorMode` hook** (`hooks/useEditorMode.ts`)
  - State: `mode` ('select' | 'paint' | 'swap')
  - Expose: `mode`, `setMode(mode)`
  - Default mode: 'select'

- [x] **2.2 Implement `useGrid` hook** (`hooks/useGrid.ts`)
  - State: `cells` (Map<string, GridCell>), `selected` (CellIndex[])
  - `initGrid()`: generate 10×10 grid with default cells
  - `setCellType(indexes, type)`: update type on selected cells
  - `setCellHeight(indexes, height)`: set height (clamped 0-10)
  - `addDecoration(indexes, decoration)`: add decoration to cell
  - `removeDecoration(indexes, decType)`: remove decoration from cell
  - `toggleCellSelection(indexes, additive?)`: select/toggle cell selection
  - `clearSelection()`: deselect all
  - `selectAll()`: select all 100 cells
  - `invertSelection()`: invert current selection
  - `deleteSelected()`: remove decorations, reset type/height on selected cells
  - `swapCells(from, to)`: swap two cells' data
  - `exportMapData()`: export current grid as `MapData` JSON
  - `importMapData(data)`: replace grid from `MapData`

## Phase 3: UI Components

- [x] **3.1 Create HexCanvas component** (`components/HexCanvas.tsx`)
  - Render SVG with 10×10 hex grid (flat-top, 40px size)
  - Each hex: `<polygon>` for hex shape, `<text>` for icon + height
  - Colors: fill from terrain color, stroke for selection state
  - CSS classes: `.hexagon`, `.hexagon.selected`, `.hexagon.dragging`, `.hexagon.valid-target`
  - Click handler: select (select mode), paint (paint mode), swap start/target (swap mode)
  - Drag handler: swap mode drag visual
  - Props: cells, selected, onCellClick, onCellSwap, mode

- [x] **3.2 Create LeftToolbar component** (`components/LeftToolbar.tsx`)
  - Three mode buttons: Select ✋ (S), Paint 🖌️ (P), Swap 🔄 (W)
  - Active mode gets `.active` class
  - Props: mode, onModeChange
  - Use CSS classes: `.mode-btn-v`, `.mode-label`

- [x] **3.3 Create TopToolbar component** (`components/TopToolbar.tsx`)
  - Presets section: Apply preset terrain configs
  - Selection section: Select All, Invert, Clear buttons
  - Actions section: Save (download JSON), Load (upload JSON file), Delete Cells
  - Props: selected, onSelectAll, onInvertSelection, onClearSelection, onDeleteSelected, onSave, onLoad
  - Use CSS classes: `.toolbar`, `.preset-buttons`, `.selection-buttons`, `.toolbar-actions`

- [x] **3.4 Create TerrainGrid component** (`components/TerrainGrid.tsx`)
  - 2-column grid of terrain type buttons
  - Each button: icon + name, highlight active
  - Props: terrains, selectedType, onSelect
  - Use CSS classes: `.terrain-grid`, `.terrain-btn`, `.terrain-icon`, `.terrain-name`, `.active`

- [x] **3.5 Create DecorationGrid component** (`components/DecorationGrid.tsx`)
  - 3-column grid of decoration buttons
  - Each button: icon + name, toggleable (add/remove)
  - Shows which decorations are on selected cell
  - Props: decorations, cellDecorations, onToggle
  - Use CSS classes: `.decoration-grid`, `.decoration-btn`, `.decoration-icon`, `.decoration-name`, `.active`

- [x] **3.6 Create HeightControl component** (`components/HeightControl.tsx`)
  - Slider input (range 0-10) with +/- buttons
  - Quick preset buttons: 0, 3, 5, 7, 10
  - Shows current value as number
  - Disabled when no selection
  - Props: height, onChange
  - Use CSS classes: `.height-control`, `.height-slider`, `.height-btn`, `.height-quick-btns`, `.quick-height-btn`, `.active`

- [x] **3.7 Create RightPanel component** (`components/RightPanel.tsx`)
  - Terrain type section header + TerrainGrid
  - Decoration section header + DecorationGrid
  - Height section header + HeightControl
  - Terrain preview hex (visual preview of selected cell's type/height)
  - Batch indicator when multiple cells selected
  - Config drawer toggle button
  - Props: all grid/selection state, callbacks
  - Use CSS classes: `.terrain-panel`, `.terrain-section`, `.terrain-preview`, `.preview-hex`, `.batch-indicator`

- [x] **3.8 Create ConfigDrawer component** (`components/ConfigDrawer.tsx`)
  - Slide-out overlay panel (fixed position, right)
  - List of saved configs with name, type, height range, decorations
  - Edit/delete actions per config
  - Add new config button
  - Config editor form: name input, terrain type select, height range inputs, decoration toggles
  - Save/Cancel actions
  - Props: configs, terrainDefs, decorationDefs, onSave, onDelete, isOpen, onClose
  - Use CSS classes: `.config-drawer`, `.drawer-overlay`, `.drawer-header`, `.config-list`, `.config-editor`

- [x] **3.9 Create Editor component** (`components/Editor.tsx`)
  - Main layout: left toolbar (50px) + main area (flex-1) + right panel (220px) + footer
  - Main area: top toolbar + canvas
  - Initializes grid on mount
  - Wires all state hooks to child components
  - Handles save (JSON download via Blob URL) and load (FileReader + JSON parse)
  - Use CSS classes: `.editor`, `.editor-left`, `.editor-main`, `.editor-top`, `.editor-content`, `.canvas-container`, `.editor-right`, `.editor-footer`

## Phase 4: API & Data Persistence

- [x] **4.1 Create map API route** (`app/api/map/route.ts`)
  - GET: read map data from `server/map-data.json` (or return default empty grid)
  - POST: write map data JSON body to `server/map-data.json`
  - Error handling for missing/invalid data

- [x] **4.2 Update server data.json for full defaults**
  - Populate `server/data.json` with all 6 terrain defs and 4 decoration defs
  - Create `server/map-data.json` as initial empty 10×10 grid

## Phase 5: Integration

- [x] **5.1 Update `app/page.tsx`**
  - Replace placeholder "hello" with `<Editor />` component
  - Ensure `'use client'` directive

- [x] **5.2 Verify CSS class alignment**
  - Ensure all component CSS classes match `globals.css` definitions
  - Fix any mismatches

- [x] **5.3 Test build**
  - Run `pnpm build` (from workspace root or `pnpm build` in package dir)
  - Fix any TypeScript errors
  - Fix any lint errors
