/**
 * AI 对话路由
 */
import { Router, type Request, type Response } from 'express';
import { aiService, type AIMode } from '../services/ai-service.js';
import { fileService } from '../services/file-service.js';

export const aiRouter = Router();

/** POST /api/ai/chat - 与 DeepSeek 对话（SSE 流式响应） */
aiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, context, mode } = req.body as {
      messages: { role: string; content: string }[];
      context?: {
        assetPath?: string;
        assetData?: any;
        batchContext?: {
          selectedAssets: { asset: any; path: string }[];
          allAssets: { asset: any; path: string }[];
          sceneName: string;
        };
      };
      mode?: AIMode;
    };

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      res.status(400).json({ error: 'DeepSeek API Key 未配置，请设置环境变量 DEEPSEEK_API_KEY' });
      return;
    }

    const aiMode: AIMode = mode || 'chat';
    const userMessage = messages[messages.length - 1]?.content || '';
    const aiMessages = aiService.buildMessages(aiMode, userMessage, context);

    const config = await fileService.readConfig();
    const model = config?.deepseekModel || 'deepseek-v4-pro';

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = '';

    try {
      for await (const chunk of aiService.chatStream(aiMessages, apiKey, model)) {
        if (chunk.content) {
          fullContent += chunk.content;
        }
        const data = JSON.stringify({
          content: chunk.content,
          done: chunk.done,
        });
        res.write(`data: ${data}\n\n`);
      }
    } catch (err: any) {
      const errorData = JSON.stringify({ content: '', done: true, error: err.message });
      res.write(`data: ${errorData}\n\n`);
    }

    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

/** POST /api/ai/edit - AI 直接编辑 JSON（非流式） */
aiRouter.post('/edit', async (req: Request, res: Response) => {
  try {
    const { instruction, assetPath, assetData } = req.body as {
      instruction: string;
      assetPath: string;
      assetData: any;
    };

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      res.status(400).json({ error: 'DeepSeek API Key 未配置，请设置环境变量 DEEPSEEK_API_KEY' });
      return;
    }

    const config = await fileService.readConfig();
    const model = config?.deepseekModel || 'deepseek-v4-pro';
    const messages = aiService.buildMessages('edit', instruction, {
      assetPath,
      assetData,
    });

    const content = await aiService.chat(messages, apiKey, model);
    const changes = aiService.parsePixelChanges(content);

    if (changes.length > 0) {
      res.json({
        modifiedJson: changes[0].pixelAsset,
        explanation: content.replace(/<<<PIXEL_CHANGE>>>[\s\S]*?<<<END_CHANGE>>>/g, '').trim(),
      });
    } else {
      res.json({
        modifiedJson: null,
        explanation: content,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
