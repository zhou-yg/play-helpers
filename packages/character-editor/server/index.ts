/**
 * Express API 服务器入口
 */
import express from 'express';
import cors from 'cors';
import { assetsRouter, assetRouter } from './routes/assets.js';
import { scenesRouter } from './routes/scenes.js';
import { configRouter } from './routes/config.js';
import { exportRouter } from './routes/export.js';
import { aiRouter } from './routes/ai.js';

const app = express();
const PORT = 3005;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 路由
app.use('/api/assets', assetsRouter);
app.use('/api/asset', assetRouter);
app.use('/api/scenes', scenesRouter);
app.use('/api/scene', scenesRouter);
app.use('/api/config', configRouter);
app.use('/api/export', exportRouter);
app.use('/api/ai', aiRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Character Editor API Server running at http://localhost:${PORT}`);
});
