# DIG-viewer

管理 3D 游戏开发文件的工具平台：快速检索图片、模型、音频、视频等资源并预览播放。

基于 **Next.js (App Router) + Tailwind CSS v4 + TypeScript** 开发。

## 功能

- **选择工作区文件夹**：以任意本地目录作为 workspace（macOS 原生文件夹选择器）
- **左侧 — 文件夹树**
  - 层级目录树，选中高亮锚定到文件夹路径；未选中时中间列表默认展示根目录文件
  - 每个文件夹显示**递归文件数量**（含所有子目录）
  - 选择 tags 筛选后，不包含相关 tags 文件的文件夹自动隐藏，计数变为命中数
- **中间 — 文件列表**
  - 关键词搜索（文件名 / 标签）
  - **标签快速筛选（全局）**：展示 workspace 内所有标签（无标签时显示「无」），点击多选；选中后同时过滤中间列表与左侧树
  - 排序：最近修改（默认，最新在前）/ A-Z
- **右侧 — 预览面板**
  - 图片、3D 模型（GLB/GLTF，`<model-viewer>` 渲染）、音频、视频
  - 标签打标：输入回车添加、× 删除，持久化到 `<workspace>/.dig-viewer/meta.json`
- **顶部标题栏**：产品标题「DIG-viewer」+「Finder打开」按钮（调起系统文件管理器打开当前所选文件夹）+ 刷新

## 运行

```bash
pnpm install   # 见下方 monorepo 注意事项
pnpm dev       # http://localhost:3000
```

> **monorepo 注意事项**：仓库根目录的 `pnpm-lock.yaml`（lockfileVersion 5.4）与本机 pnpm 12 不兼容，
> 且 DSH 沙箱拒绝 pnpm 向仓库根目录写 workspace-state / lockfile。因此本包当前通过软链使用
> 独立安装的依赖（`node_modules -> /tmp/digv-final/node_modules`）。在宿主机上正常执行
> `pnpm install` 前需先删除该软链，或升级根目录 pnpm/lockfile 后在 workspace 模式下安装。

## 目录结构

```
src/
├── app/
│   ├── layout.tsx            # 根布局（暗色主题）
│   ├── page.tsx              # Home：顶栏 + 左中右三栏
│   ├── globals.css           # Tailwind 入口
│   └── api/
│       ├── scan/route.ts     # GET  扫描 workspace → 目录树 + 文件列表（含标签）
│       ├── pick-folder/route.ts # POST 原生文件夹选择器（macOS osascript）
│       ├── open/route.ts     # POST 在系统文件管理器中打开路径
│       ├── file/route.ts     # GET  流式读取文件用于预览
│       └── tags/route.ts     # POST 写入标签到 .dig-viewer/meta.json
├── components/
│   ├── TopBar.tsx            # 顶部标题栏
│   ├── FileTree.tsx          # 左侧文件夹树
│   ├── AssetList.tsx         # 中间文件列表 + 搜索/筛选/排序
│   ├── PreviewPane.tsx       # 右侧预览 + 标签编辑
│   └── ModelPreview.tsx      # GLB/GLTF <model-viewer> 封装
├── lib/
│   ├── types.ts              # Asset / DirNode / WorkspaceMeta 类型
│   ├── asset-kinds.ts        # 扩展名 → 类型、格式化工具
│   └── workspace-store.tsx   # 全局状态（Context + API 调用）
└── types/
    └── model-viewer.d.ts     # model-viewer 自定义元素声明
```

## 支持的文件类型

| 类型 | 扩展名 |
|------|--------|
| 图片 | png jpg jpeg gif webp svg bmp ico avif tiff |
| 3D 模型 | glb gltf |
| 音频 | mp3 wav ogg flac m4a aac |
| 视频 | mp4 webm mov avi mkv |

其他类型在列表中展示为「File」，预览面板提示不支持预览。
