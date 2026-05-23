# Proposal: Implement Hexagon Editor Web Application

## Motivation

The hexagon-editor package is currently a Next.js scaffold with placeholder content — `app/page.tsx` only renders `<div>hello</div>`. The CSS design system (765 lines in `globals.css`) defines a complete editor UI, but no component logic exists to wire it up. The goal is to implement the full hexagon grid map editor as a functional Next.js web application.

## What We're Building

A web-based hexagon grid map editor for game development, with:

- **Hex grid rendering**: SVG-based 10×10 hexagon grid using axial coordinates
- **Terrain painting**: 6 terrain types (grass, water, mountain, forest, sand, stone) selectable via right panel
- **Height adjustment**: Per-cell height slider (0-10) with quick preset buttons
- **Decoration placement**: Rock, tree, water, and other decorations on grid cells
- **Multi-select & batch editing**: Select multiple hexes to edit terrain/height in batch
- **JSON import/export**: Save and load maps matching the AGENTS.md data format
- **Editor modes**: Select mode, paint mode, swap mode (drag-to-swap hexagons)
- **Terrain config management**: Slide-out drawer for creating and managing terrain configurations

## Data Format (from AGENTS.md)

```json
{
  "grid": [
    {
      "indexes": [0, 0],
      "height": 2,
      "type": "grass",
      "decorations": [{ "type": "rock" }]
    }
  ]
}
```

## Non-Goals

- Godot GDScript plugin (separate concern, `plugin.cfg` references nonexistent files)
- User authentication or multi-user collaboration
- Cloud save/load — file-based persistence only
- Mobile responsive design — desktop-focused editor
