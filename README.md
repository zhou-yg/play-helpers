# play-helpers

A pnpm monorepo for gameplay development kits and helpers.

## Structure

```
play-helpers/
├── apps/           # Standalone applications
│   └── hexagon-editor-web/   # Web-based hexagon grid editor
├── packages/      # Shared libraries and kits
│   └── hexagon-editor/       # Godot GDScript hexagon editor plugin
├── pnpm-workspace.yaml
└── package.json
```

## Packages

### @play-helpers/hexagon-editor (Godot Plugin)
Hexagon grid map editor for Godot with drag-and-drop support.

**Location:** `packages/hexagon-editor/`

**Features:**
- 10x10 hexagon grid with axial coordinate system
- 6 terrain types: grass, water, mountain, forest, sand, stone
- Click to paint, drag to swap hexagons
- JSON save/load support

**Installation:** Copy to `res://addons/hexagon-editor/` in your Godot project.

### hexagon-editor-web (Web App)
Retro-futuristic tactical map editor with CRT aesthetic.

**Location:** `apps/hexagon-editor-web/`

**Features:**
- 10x10 hexagon grid with real-time rendering
- 6 terrain types with phosphor-green tactical UI
- Click to paint, drag to flood-fill
- JSON export/import
- CRT scanline effects and glow animations

**Usage:** Open `index.html` in a browser, or serve via any static file server.

## Commands

```bash
pnpm install     # Install all dependencies
pnpm build       # Build all packages
pnpm test        # Run tests
pnpm lint        # Lint all packages
pnpm clean       # Clean all build artifacts
```

## Development

### Adding a Godot Package
```bash
mkdir packages/my-package
cd packages/my-package
pnpm init
```

### Adding a Web App
```bash
mkdir apps/my-app
cd apps/my-app
pnpm init
```
