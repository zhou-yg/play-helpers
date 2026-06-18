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

