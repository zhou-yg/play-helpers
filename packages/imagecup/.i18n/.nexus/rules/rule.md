# CLAUDE.md

ImageCup 项目专用上下文和约定。

## 项目概述

ImageCup 是一个基于 React + Vite + TypeScript 的图片背景清理工具，运行在浏览器端，无需后端服务。所有图片处理均使用 Canvas API 在客户端完成。

## 技术栈

- **框架**: React 18 + TypeScript (strict)
- **构建**: Vite 5
- **处理**: Canvas API (纯前端)
- **包管理**: pnpm (monorepo `@play-helpers/imagecup`)

## 项目结构

```
packages/imagecup/
├── public/              静态资源
├── src/
│   ├── main.tsx         入口文件
│   ├── App.tsx          主组件，负责布局和数据流
│   ├── App.css          组件样式
│   ├── index.css        全局样式 / CSS 变量
│   ├── vite-env.d.ts    Vite 类型声明
│   ├── components/
│   │   ├── Toolbar.tsx         顶部工具栏（导出按钮）
│   │   ├── ImageUploader.tsx   图片上传组件（拖拽/点击）
│   │   ├── ImagePreview.tsx    左侧预览区（原图/清理后/拆分结果）
│   │   └── SettingsPanel.tsx   右侧设置面板（颜色/容差/拆分开关）
│   ├── hooks/
│   │   └── useImageProcessing.ts  核心状态管理 hook
│   ├── utils/
│   │   ├── colorUtils.ts          颜色转换、距离计算
│   │   └── imageProcessor.ts      背景去除、自动拆分算法
│   └── types/
│       └── index.ts               类型定义
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.node.json
```

## 命令

```bash
pnpm dev          # 启动开发服务器 (port 3003)
pnpm build        # 生产构建
pnpm lint         # 类型检查 (tsc --noEmit)
```

## 核心功能

### 1. 背景颜色移除
- 通过 `imageProcessor.ts` 中的 `removeBackground()` 实现
- 遍历每个像素，计算与目标颜色的 RGB 欧几里得距离
- 距离 ≤ tolerance 的像素设为透明 (alpha = 0)
- 支持多个目标颜色（杂色背景）

### 2. 自动拆分
- 背景移除后，使用 flood fill（4 邻域泛洪）检测连通区域
- `autoSplit()` 返回每个连通区域的 canvas
- 忽略小于 4 像素的噪点区域
- 按 bounding box 裁剪每个独立图片

### 3. 颜色选取
- 在原图预览中点击即可拾取背景颜色
- 通过 `ImagePreview` 的 canvas 离屏渲染实现像素级拾取

## 编码约定

- Hooks: `useCallback` 包裹所有事件处理函数
- 样式: 纯 CSS，暗色主题，CSS 变量定义在 `index.css`
- 组件: 函数式组件 + React.FC 类型
- ID 生成: `Math.random().toString(36)` 生成短随机 ID
- URL 管理: 使用 `URL.createObjectURL` / `URL.revokeObjectURL` 管理 blob URL

## 数据流

```
ImageUploader → addImages() → images[]
SettingsPanel → updateTargetColors/updateTolerance/toggleAutoSplit → settings
    ↓
processCurrentImage(id)
    → loadImageFromFile → HTMLImageElement
    → processImage(img, colors, tolerance, autoSplit)
        → removeBackground (canvas)
        → autoSplit (canvas pieces)
    → processedImages[]
    ↓
ImagePreview ← 展示原图/清理后/拆分结果
Toolbar ← export (导出为 PNG)
```
