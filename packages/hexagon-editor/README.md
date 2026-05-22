# Hexagon Editor

A web tool for creating and editing hexagon grid maps with drag-and-drop support.

使用 react 和 vite , nodejs 开发

## Usage

### 1. Start the API server (in a separate terminal)

```bash
node server/index.js
```

The API server runs on http://localhost:3001

### 2. Start the frontend (in another terminal)

```bash
pnpm install
pnpm dev
```

1. Run `pnpm dev` to start the development server
2. 在编辑器中拖动六边形网格，生成不同的地图排列结构
3. 点击选中六边形，然后在右侧面板设置地形类型和高度
4. 点击保存按钮，保存地图为 JSON 文件

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| V | Select mode |
| A | Add mode |
| D | Delete mode |
| B | Paint mode |
| X / Delete | Delete selected |
| Ctrl+A | Select all |
| Escape | Deselect all |
| Shift+Click | Add to selection |
| Ctrl/Cmd+Click | Toggle selection |

## Mouse Controls

| Action | Result |
|--------|--------|
| Click hexagon | Select |
| Shift+Click | Add to selection |
| Click empty space | Clear selection |
| Drag on hexagon | Move hexagon |
| Drag on empty space | Box selection |

## Batch Operations

1. **Select multiple hexagons** using box selection (drag on empty space) or Shift+Click
2. **Adjust height** with slider, +/- buttons, or quick buttons (0, 2, 4, 6, 8, 10)
3. **Change terrain type** - applies to all selected hexagons immediately
4. Height range: **0-10**

## JSON Format

```json
{
  "hexagons": [
    {
      "id": "hex-1",
      "q": 0, "r": 0,
      "type": "grass",
      "height": 1,
      "decorations": ["tree", "flower"]
    }
  ],
}
```

## Terrain Types (Default)

Default terrain types are hardcoded and cannot be deleted:

| Type | Icon | Suggested Height | Description |
|------|------|------------------|-------------|
| grass | ▓ | 0-3 | 草地 |
| water | ≋ | 0-1 | 水域 |
| mountain | ▲ | 1-10 | 山脉 |
| forest | ♣ | 0-2 | 森林 |
| sand | · | 0-1 | 沙地 |
| stone | ◆ | 1-10 | 岩石 |

## Decorations (Default)

Default decoration types are hardcoded and cannot be deleted:

| Type | Icon | Description |
|------|------|-------------|
| tree | 🌲 | 树 |
| flower | 🌸 | 花 |
| rock | 🪨 | 石头 |
| bush | 🌿 | 灌木 |
| mushroom | 🍄 | 蘑菇 |
| grass | 🌱 | 小草 |

## Custom Terrain & Decoration Types

You can create custom terrain types and decoration types via the config panel:

1. Click **⚙️ 配置** to open the config panel
2. Switch to **地形类型** tab to create/edit/delete custom terrain types
3. Switch to **装饰类型** tab to create/edit/delete custom decoration types
4. Custom types are stored on the server and persist across sessions

## Terrain Configuration

The terrain configuration panel allows you to create and manage terrain presets with custom settings. Each config includes:

- **name**: Display name for the config
- **terrainType**: Base terrain type (grass, water, mountain, etc.)
- **heightRange**: Min and max height values
- **decorations**: Array of decoration types
- **base**: Base material label

Configurations are saved to the Node.js server and automatically loaded when you open the page.

## Structure

```
hexagon-editor/
├── plugin.cfg              # Godot plugin configuration
├── package.json            # Package metadata
├── index.html              # Entry HTML
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── main.tsx            # React entry point
│   ├── terrains.ts          # Default terrain/decoration definitions
│   ├── api.ts               # API client for server communication
│   └── ...
├── server/
│   └── index.js             # Node.js API server
└── dist/                   # Build output
```
