/**
 * 素材文件 CRUD 路由
 */
import { Router, type Request, type Response } from 'express';
import { fileService } from '../services/file-service.js';
import { createEmptyPixels } from '../utils/pixel-utils.js';

export const assetsRouter = Router();

/** GET /api/assets - 扫描所有素材文件 */
assetsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const assets = await fileService.scanAssets();
    const folderPath = await fileService.getAssetFolderPath();
    res.json({ assets, folderPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/asset - 读取单个素材文件 */
export const assetRouter = Router();

assetRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).json({ error: 'Missing path parameter' });
      return;
    }
    const data = await fileService.readAsset(filePath);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/asset - 创建素材文件 */
assetRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { path: filePath, data } = req.body;
    if (!filePath || !data) {
      res.status(400).json({ error: 'Missing path or data' });
      return;
    }
    await fileService.createAsset(filePath, data);
    res.json({ success: true, path: filePath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/asset - 更新素材文件 */
assetRouter.put('/', async (req: Request, res: Response) => {
  try {
    const { path: filePath, data } = req.body;
    if (!filePath || !data) {
      res.status(400).json({ error: 'Missing path or data' });
      return;
    }
    await fileService.writeAsset(filePath, data);
    res.json({ success: true, path: filePath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/asset - 删除素材文件 */
assetRouter.delete('/', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).json({ error: 'Missing path parameter' });
      return;
    }
    await fileService.deleteAsset(filePath);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/asset/new - 创建空白素材 */
assetRouter.post('/new', async (req: Request, res: Response) => {
  try {
    const { name, width, height, folderPath } = req.body;
    const w = width || 16;
    const h = height || 16;
    const assetName = name || 'untitled';
    const dir = folderPath || await fileService.getAssetFolderPath();
    const filePath = `${dir}/${assetName}.json`;

    const data = {
      name: assetName,
      pixels: createEmptyPixels(w, h),
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    await fileService.createAsset(filePath, data);
    res.json({ success: true, path: filePath, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
