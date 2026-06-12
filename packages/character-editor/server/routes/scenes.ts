/**
 * 场景 CRUD 路由
 */
import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { fileService } from '../services/file-service.js';

export const scenesRouter = Router();

/** GET /api/scenes - 获取所有场景列表 */
scenesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const scenes = await fileService.readScenes();
    const list = scenes.map(s => ({
      id: s.id,
      name: s.name,
      assetCount: s.assets?.length || 0,
      createdAt: s.createdAt,
    }));
    res.json({ scenes: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/scene/:id - 获取场景详情 */
scenesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const scene = await fileService.readScene(req.params.id);
    res.json(scene);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/scene - 创建新场景 */
scenesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, canvasConfig } = req.body;
    const scene = {
      id: uuidv4(),
      name: name || '未命名场景',
      assets: [],
      canvasConfig: canvasConfig || {
        width: 512,
        height: 512,
        bgColor: '#222222',
        pixelSize: 16,
      },
      selectedAssetIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await fileService.writeScene(scene.id, scene);
    res.json(scene);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/scene/:id - 更新场景 */
scenesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const scene = await fileService.readScene(req.params.id);
    const updated = {
      ...scene,
      ...req.body,
      id: scene.id,
      updatedAt: new Date().toISOString(),
    };
    await fileService.writeScene(scene.id, updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/scene/:id - 删除场景 */
scenesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await fileService.deleteScene(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/scene/:id/assets - 向场景添加素材 */
scenesRouter.post('/:id/assets', async (req: Request, res: Response) => {
  try {
    const scene = await fileService.readScene(req.params.id);
    const { assetPath, x, y, scale } = req.body;

    // 读取素材数据
    const pixelData = await fileService.readAsset(assetPath);
    const newAsset = {
      id: uuidv4(),
      assetPath,
      x: x || 0,
      y: y || 0,
      scale: scale || 1,
      selected: false,
      pixelData,
    };

    scene.assets.push(newAsset);
    scene.updatedAt = new Date().toISOString();
    await fileService.writeScene(scene.id, scene);
    res.json(scene);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/scene/:id/assets/:assetId - 从场景移除素材 */
scenesRouter.delete('/:id/assets/:assetId', async (req: Request, res: Response) => {
  try {
    const scene = await fileService.readScene(req.params.id);
    scene.assets = scene.assets.filter((a: any) => a.id !== req.params.assetId);
    scene.selectedAssetIds = scene.selectedAssetIds.filter((id: string) => id !== req.params.assetId);
    scene.updatedAt = new Date().toISOString();
    await fileService.writeScene(scene.id, scene);
    res.json(scene);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/scene/:id/select - 设置场景中选中的素材 */
scenesRouter.post('/:id/select', async (req: Request, res: Response) => {
  try {
    const scene = await fileService.readScene(req.params.id);
    const { selectedAssetIds } = req.body;
    scene.selectedAssetIds = selectedAssetIds || [];
    // 更新每个素材的 selected 状态
    scene.assets = scene.assets.map((a: any) => ({
      ...a,
      selected: scene.selectedAssetIds.includes(a.id),
    }));
    scene.updatedAt = new Date().toISOString();
    await fileService.writeScene(scene.id, scene);
    res.json(scene);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
