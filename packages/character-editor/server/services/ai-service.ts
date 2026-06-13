/**
 * DeepSeek AI 调用服务
 */
import type { PixelAsset } from '../../src/types/index.js';
import { extractUniqueColors, getPixelWidth, getPixelHeight } from '../utils/pixel-utils.js';

// ===== System Prompts =====

const BASE_SYSTEM_PROMPT = `你是 PixelCraft，一个专业的像素艺术编辑助手。你的任务是帮助用户创建和修改像素角色的 JSON 数据。

## JSON 数据格式

你操作的 JSON 数据格式如下：

{
  "name": "素材名称",
  "pixels": [
    ["#RRGGBBAA", "#RRGGBBAA", ...],
    ["#RRGGBBAA", "#RRGGBBAA", ...],
    ...
  ],
  "meta": {
    "author": "作者",
    "description": "描述",
    "tags": ["标签"],
    "palette": ["#RRGGBBAA", ...],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}

### 颜色格式规范
- 格式：#RRGGBBAA（8位十六进制，带透明度）
- RR = 红色通道 (00-FF)
- GG = 绿色通道 (00-FF)
- BB = 蓝色通道 (00-FF)
- AA = 透明度通道 (00=完全透明, FF=完全不透明)
- 透明像素必须使用 "#00000000"
- 所有颜色值必须以 # 开头，8位十六进制

### 像素坐标系
- pixels[y][x]：y 为行号（从上到下），x 为列号（从左到右）
- 左上角为 (0, 0)
- 常见尺寸：8x8, 16x16, 32x32, 64x64

## 画布尺寸约束（关键！）
- 当前画布尺寸将在上下文中明确给出，你必须严格遵守
- 输出的 pixels 数组行数必须等于画布高度，每行的列数必须等于画布宽度
- 除非用户明确要求调整尺寸，否则必须保持原始尺寸不变
- 如果输出尺寸与画布尺寸不匹配，变更将被视为无效

## 基本规则
1. 修改像素时，必须返回完整的修改后 JSON，不能只返回变更部分
2. 保持 pixels 数组的行列结构不变，除非用户明确要求调整尺寸
3. 不改变用户未要求修改的像素颜色
4. 确保所有颜色值格式正确（#RRGGBBAA）
5. 如果用户的指令不明确，先询问确认再进行修改`;

const CHAT_MODE_PROMPT = `## 当前对话模式：自由对话

你正在与用户进行像素艺术的对话式编辑。用户可能会用自然语言描述他们想要的修改。

### 交互指南
- 用中文回复
- 先理解用户意图，再进行修改
- 对于模糊的指令（如"改好看一点"），给出你的理解和具体方案，征得用户同意后再修改
- 如果涉及区域修改（如"帽子"），需要根据像素图推断该区域的位置范围
- 修改完成后，简要说明你做了什么改动

### 回复格式
当你需要修改像素数据时，在回复的最后用以下格式输出变更：

<<<PIXEL_CHANGE>>>
{完整的修改后 PixelAsset JSON}
<<<END_CHANGE>>>

如果没有修改像素数据，正常回复即可，不需要包含 <<<PIXEL_CHANGE>>> 标记。`;

const EDIT_MODE_PROMPT = `## 当前对话模式：指令编辑

用户通过精确的编辑指令修改像素数据。你需要严格按照指令执行，不做额外修改。

### 执行规则
1. 严格按照指令操作，不自行发挥
2. 只修改指令涉及的区域或颜色
3. 保持其他像素完全不变
4. 必须返回完整的修改后 JSON

### 回复格式
直接输出修改结果，格式如下：

<<<PIXEL_CHANGE>>>
{完整的修改后 PixelAsset JSON}
<<<END_CHANGE>>>

说明：{一句话描述你做了什么修改}`;

const BATCH_MODE_PROMPT = `## 当前对话模式：批量处理

用户需要对多个素材进行统一的修改操作。你需要对每个素材分别处理并返回结果。

### 执行规则
1. 对每个素材独立执行相同的修改逻辑
2. 保持每个素材的原始尺寸和结构
3. 分别返回每个素材的修改结果

### 回复格式
对每个素材输出一个变更块：

<<<PIXEL_CHANGE file="文件路径1">>>
{完整的修改后 PixelAsset JSON}
<<<END_CHANGE>>>

<<<PIXEL_CHANGE file="文件路径2">>>
{完整的修改后 PixelAsset JSON}
<<<END_CHANGE>>>

说明：
- 文件1: {修改说明}
- 文件2: {修改说明}`;

// ===== Context Injection =====

function buildAssetContext(asset: PixelAsset, assetPath: string): string {
  const colors = extractUniqueColors(asset.pixels);
  const w = getPixelWidth(asset.pixels);
  const h = getPixelHeight(asset.pixels);

  return `## 当前素材数据

文件名: ${asset.name}
文件路径: ${assetPath}
尺寸: ${w}x${h}
使用的颜色: ${colors.join(', ')}

\`\`\`json
${JSON.stringify(asset, null, 2)}
\`\`\``;
}

function buildBatchContext(
  selectedAssets: { asset: PixelAsset; path: string }[],
  allAssets: { asset: PixelAsset; path: string }[],
  sceneName: string
): string {
  const selectedParts = selectedAssets.map((item, i) => {
    const colors = extractUniqueColors(item.asset.pixels);
    const w = getPixelWidth(item.asset.pixels);
    const h = getPixelHeight(item.asset.pixels);
    return `--- 素材 ${i + 1} ---
文件名: ${item.asset.name}
文件路径: ${item.path}
尺寸: ${w}x${h}
使用的颜色: ${colors.join(', ')}

\`\`\`json
${JSON.stringify(item.asset, null, 2)}
\`\`\``;
  }).join('\n\n');

  const otherParts = allAssets
    .filter(a => !selectedAssets.find(s => s.path === a.path))
    .map(a => {
      const w = getPixelWidth(a.asset.pixels);
      const h = getPixelHeight(a.asset.pixels);
      return `- ${a.asset.name}: ${a.path}, ${w}x${h}`;
    }).join('\n');

  return `## 当前场景数据

场景名称: ${sceneName}
场景中共有 ${allAssets.length} 个素材，用户选中了 ${selectedAssets.length} 个进行编辑。

### 选中的素材（需要修改）

${selectedParts}

${otherParts ? `### 场景中的其他素材（仅供参考，不需要修改）\n\n${otherParts}` : ''}`;
}

// ===== AI Service =====

export type AIMode = 'chat' | 'edit' | 'batch';

export class AIService {
  private getBaseUrl(): string {
    return 'https://api.deepseek.com';
  }

  /**
   * 构建消息列表
   */
  buildMessages(
    mode: AIMode,
    userMessage: string,
    context?: {
      assetPath?: string;
      assetData?: PixelAsset;
      batchContext?: {
        selectedAssets: { asset: PixelAsset; path: string }[];
        allAssets: { asset: PixelAsset; path: string }[];
        sceneName: string;
      };
    }
  ): any[] {
    const messages: any[] = [];

    // 1. 基础系统提示词
    messages.push({ role: 'system', content: BASE_SYSTEM_PROMPT });

    // 2. 模式提示词
    if (mode === 'chat') {
      messages.push({ role: 'system', content: CHAT_MODE_PROMPT });
    } else if (mode === 'edit') {
      messages.push({ role: 'system', content: EDIT_MODE_PROMPT });
    } else if (mode === 'batch') {
      messages.push({ role: 'system', content: BATCH_MODE_PROMPT });
    }

    // 3. 上下文注入
    if (context?.batchContext) {
      const batchCtx = buildBatchContext(
        context.batchContext.selectedAssets,
        context.batchContext.allAssets,
        context.batchContext.sceneName
      );
      messages.push({ role: 'system', content: batchCtx });

      // 为每个选中素材注入独立的画布尺寸约束
      for (const item of context.batchContext.selectedAssets) {
        const w = getPixelWidth(item.asset.pixels);
        const h = getPixelHeight(item.asset.pixels);
        messages.push({
          role: 'system',
          content: `【画布尺寸约束】素材 "${item.asset.name}" (${item.path}) 的画布尺寸为 ${w}x${h}（宽${w}列 x 高${h}行），输出的 pixels 数组必须严格为 ${h} 行 x ${w} 列。`,
        });
      }
    } else if (context?.assetData && context?.assetPath) {
      const assetCtx = buildAssetContext(context.assetData, context.assetPath);
      messages.push({ role: 'system', content: assetCtx });

      // 注入独立的画布尺寸约束系统消息
      const w = getPixelWidth(context.assetData.pixels);
      const h = getPixelHeight(context.assetData.pixels);
      messages.push({
        role: 'system',
        content: `【画布尺寸约束】当前素材 "${context.assetData.name}" 的画布尺寸为 ${w}x${h}（宽${w}列 x 高${h}行）。你输出的 pixels 数组必须严格为 ${h} 行 x ${w} 列，即 pixels.length === ${h} 且 pixels[0].length === ${w}。除非用户明确要求调整尺寸，否则不得改变。`,
      });
    }

    // 4. 用户消息
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * 流式调用 DeepSeek API (SSE)
   */
  async *chatStream(
    messages: any[],
    apiKey: string,
    model: string
  ): AsyncGenerator<{ content: string; done: boolean }> {
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') {
          if (trimmed === 'data: [DONE]') {
            yield { content: '', done: true };
          }
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content || '';
            const finishReason = json.choices?.[0]?.finish_reason;
            if (content) {
              yield { content, done: false };
            }
            if (finishReason === 'stop') {
              yield { content: '', done: true };
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
  }

  /**
   * 非流式调用 DeepSeek API
   */
  async chat(
    messages: any[],
    apiKey: string,
    model: string
  ): Promise<string> {
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    return json.choices?.[0]?.message?.content || '';
  }

  /**
   * 解析 AI 回复中的 PIXEL_CHANGE 块
   */
  parsePixelChanges(content: string): { filePath?: string; pixelAsset: PixelAsset }[] {
    const changes: { filePath?: string; pixelAsset: PixelAsset }[] = [];

    // 匹配批量模式: <<<PIXEL_CHANGE file="...">>>
    const batchRegex = /<<<PIXEL_CHANGE\s+file="([^"]+)">>>\s*([\s\S]*?)<<<END_CHANGE>>>/g;
    let match;
    while ((match = batchRegex.exec(content)) !== null) {
      try {
        const pixelAsset = JSON.parse(match[2].trim());
        changes.push({ filePath: match[1], pixelAsset });
      } catch {
        console.error('Failed to parse batch PIXEL_CHANGE');
      }
    }

    // 匹配单素材模式: <<<PIXEL_CHANGE>>>
    if (changes.length === 0) {
      const singleRegex = /<<<PIXEL_CHANGE>>>\s*([\s\S]*?)<<<END_CHANGE>>>/g;
      while ((match = singleRegex.exec(content)) !== null) {
        try {
          const pixelAsset = JSON.parse(match[1].trim());
          changes.push({ pixelAsset });
        } catch {
          console.error('Failed to parse single PIXEL_CHANGE');
        }
      }
    }

    return changes;
  }
}

export const aiService = new AIService();
