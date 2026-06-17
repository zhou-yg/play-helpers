# @play-helpers/perfect-pixel

> Auto detect and get perfect pixel art — pure TypeScript, browser-ready

从 Python [perfect-pixel](../../third-parts/pixel-tools/) 移植的纯 TypeScript 实现，零外部依赖，可直接在浏览器端运行。

## 特性

- 🔍 自动检测像素风格图片的网格尺寸（FFT 频域分析 + 梯度分析兜底）
- 🎯 网格线精修（吸附到边缘梯度峰值）
- 🎨 三种采样方法：center / median / majority（K=2 聚类）
- 📦 零外部依赖，仅使用原生 Web API（Float64Array、Canvas 等）
- 🌐 浏览器端直接运行，无需 Node.js 后端

## 安装

```bash
pnpm install
```

## 快速使用

```typescript
import { getPerfectPixel, imageFromFile, renderToCanvas, scaleImageNearest } from "@play-helpers/perfect-pixel";

// 从文件加载图片
const image = await imageFromFile(fileInput.files[0]);

// 处理
const result = getPerfectPixel(image, {
  sampleMethod: "center",   // "center" | "median" | "majority"
  refineIntensity: 0.3,     // 网格精修强度 [0, 0.5]
  fixSquare: true,           // 近似正方形时自动修正
});

if (result) {
  console.log(`输出: ${result.refinedW}×${result.refinedH}`);

  // 渲染到 Canvas
  renderToCanvas(result.image, canvas);

  // 8 倍放大（最近邻插值，保持像素感）
  const scaled = scaleImageNearest(result.image, 8);
  renderToCanvas(scaled, scaledCanvas);
}
```

## API

### `getPerfectPixel(image, options?)`

核心函数，自动检测网格并生成完美像素画。

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|:---|:---|:---|:---|
| `image` | `RGBImage` | — | 输入 RGB 图像 `{ data, width, height }` |
| `options.sampleMethod` | `"center" \| "median" \| "majority"` | `"center"` | 采样方法 |
| `options.gridSize` | `[number, number] \| null` | `null` | 手动指定网格尺寸 [W, H]，覆盖自动检测 |
| `options.minSize` | `number` | `4` | 最小像素块尺寸 |
| `options.peakWidth` | `number` | `6` | FFT 峰值检测的最小峰宽 |
| `options.refineIntensity` | `number` | `0.25` | 网格精修强度 [0, 0.5]，搜索范围 = ±cellSize × intensity |
| `options.fixSquare` | `boolean` | `true` | 宽高差 1 时自动修正为正方形 |

**返回：** `PerfectPixelResult | null`

### 辅助函数

| 函数 | 说明 |
|:---|:---|
| `imageFromFile(file)` | 从 File/Blob 加载 RGBImage |
| `imageFromHTMLImage(img)` | 从 HTMLImageElement/Canvas/ImageBitmap 创建 RGBImage |
| `loadImage(url)` | 从 URL 加载 RGBImage |
| `renderToCanvas(image, canvas)` | 渲染 RGBImage 到 Canvas |
| `scaleImageNearest(image, factor)` | 最近邻插值放大 |

## Demo

```bash
pnpm dev
```

浏览器会打开 `demo.html`，支持拖拽图片、调参、下载结果。

## 算法原理

与 Python 版本完全一致，详见[原项目说明](../../third-parts/pixel-tools/readme.md)。

1. **网格尺寸检测**：FFT 频域分析检测周期性 → 若失败则回退到梯度峰值分析
2. **网格线精修**：Sobel 梯度 + 峰值吸附，从图像中心向两侧扩展
3. **像素采样**：center（中心点）/ median（中位数）/ majority（K=2 聚类多数表决）

## 文件结构

```
src/
├── types.ts          # 类型定义（RGBImage, Mat2D, PerfectPixelResult 等）
├── fft.ts            # 2D FFT 实现（Cooley-Tukey radix-2）
├── image-utils.ts    # 图像工具（灰度转换、Sobel、平滑、Canvas 交互等）
├── grid-detect.ts    # 网格尺寸检测（FFT + 梯度分析）
├── grid-refine.ts    # 网格线精修（边缘吸附）
├── sampling.ts       # 像素采样（center/median/majority）
└── index.ts          # 入口，整合所有模块
```
