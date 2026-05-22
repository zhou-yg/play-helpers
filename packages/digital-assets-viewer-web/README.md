# DAM Resource Viewer

A web-based asset viewer for Godot projects, built with Next.js.

## Features

- **File Tree**: Left sidebar showing directory structure (only folders containing assets)
- **Asset List**: Middle panel displaying assets in a table view (name, type, size)
- **Preview Panel**: Right panel for previewing selected assets
- **Supported Formats**:
  - Images: PNG, JPG, WEBP, SVG, TGA, BMP, GIF
  - 3D Models: GLB
  - Video: WebM, OGV, MP4
  - Audio: WAV, MP3, OGG
- **Directory Input**: Top-right input to switch between projects
- **Path History**: Remembers and allows quick switching between recent directories
- **Filters**: Search by name, filter by asset type, sort by name/size/date
- **3D Preview**: Interactive Three.js viewer with orbit controls
- **Image Preview**: Zoom and pan support
- **Audio Preview**: Waveform visualization with wavesurfer.js
- **Global CLI**: `dam-viewer` command for easy startup

## Quick Start

```bash
# Install dependencies
npm install

# Start the server (uses path from .env or last used path)
node bin/cli.js

# Or with a specific path
node bin/cli.js ~/Documents/godot/my-project

# Or with custom port
node bin/cli.js -p 8080
```

Then open http://localhost:3000

## Global CLI Installation

```bash
npm install -g
```

Then you can run `dam-viewer` from anywhere.

## CLI Options

```
dam-viewer [path]    Project path (default: last used or .env value)
-p, --port <port>    Port number (default: 3000)
```

## Project Structure

```
app/
├── api/                    # API routes
│   ├── scan/              # Scan directory for assets
│   ├── file/              # Serve file content
│   └── thumbnail/         # Generate thumbnails
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   ├── preview/           # Asset preview components
│   ├── AssetList.tsx     # Asset table view
│   ├── DirectoryInput.tsx # Path input with history
│   ├── FileTree.tsx       # Directory tree
│   └── FilterBar.tsx      # Search and filter
├── context/
│   └── AssetContext.tsx   # Global state
├── lib/
│   ├── scanner.ts         # Directory scanning
│   ├── fileTypes.ts       # File type mapping
│   └── utils.ts           # Utilities
└── page.tsx               # Main page
```

## Configuration

Create a `.env` file in the project root:

```
target_project=~/Documents/godot/your-project
```

Or use the directory input in the UI to switch projects.

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- Three.js + @react-three/fiber
- wavesurfer.js
- sharp (thumbnail generation)
