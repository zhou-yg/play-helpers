/**
 * 配置管理路由
 */
import { Router, type Request, type Response } from 'express';
import { fileService } from '../services/file-service.js';

export const configRouter = Router();

/** GET /api/config - 获取当前配置 */
configRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await fileService.readConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/config - 更新配置 */
configRouter.put('/', async (req: Request, res: Response) => {
  try {
    const currentConfig = await fileService.readConfig();
    const updatedConfig = { ...currentConfig, ...req.body };
    await fileService.writeConfig(updatedConfig);
    res.json(updatedConfig);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
