/**
 * 导出路由
 */
import { Router, type Request, type Response } from 'express';
import { renderService } from '../services/render-service.js';

export const exportRouter = Router();

/** POST /api/export - 导出图片 */
exportRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { items, canvasWidth, canvasHeight, pixelSize, format } = req.body;

    // 前端导出为主，后端提供备选方案
    // 这里简化实现：使用前端传递的像素数据生成图片
    res.status(200).json({
      message: '请使用前端导出功能',
      hint: '前端 PixelRenderer.exportToImage() 可直接生成图片下载',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
