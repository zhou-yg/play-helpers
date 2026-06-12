/**
 * AI 对话状态管理
 */
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AIChatMessage, PixelAsset } from '../types';
import { getApiUrl } from '../lib/api';

interface AIState {
  /** 是否打开 AI 面板 */
  isOpen: boolean;
  /** 对话消息列表 */
  messages: AIChatMessage[];
  /** 是否正在生成回复 */
  isStreaming: boolean;
  /** 当前流式内容 */
  streamingContent: string;
  /** AI 模式 */
  mode: 'chat' | 'edit' | 'batch';
  /** 建议的变更 */
  suggestedChanges: { filePath?: string; pixelAsset: PixelAsset }[];
  /** 是否批量模式 */
  isBatchMode: boolean;

  // Actions
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  sendMessage: (content: string, context?: any) => Promise<void>;
  setMode: (mode: 'chat' | 'edit' | 'batch') => void;
  applyChange: (index: number) => void;
  dismissChange: (index: number) => void;
  applyAllChanges: () => void;
  dismissAllChanges: () => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  isOpen: false,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  mode: 'chat',
  suggestedChanges: [],
  isBatchMode: false,

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),

  sendMessage: async (content, context) => {
    const userMessage: AIChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      streamingContent: '',
    }));

    try {
      const response = await fetch(getApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
          context,
          mode: get().mode,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                set({ streamingContent: fullContent });
              }
              if (data.done) {
                // 解析 PIXEL_CHANGE 块
                const changes = parsePixelChanges(fullContent);
                const assistantMessage: AIChatMessage = {
                  id: uuidv4(),
                  role: 'assistant',
                  content: fullContent.replace(/<<<PIXEL_CHANGE[^>]*>>>[\s\S]*?<<<END_CHANGE>>>/g, '').trim(),
                  timestamp: Date.now(),
                  suggestedChange: changes.length > 0 ? {
                    path: changes[0].filePath || '',
                    originalJson: {} as PixelAsset,
                    modifiedJson: changes[0].pixelAsset,
                  } : undefined,
                };

                set((state) => ({
                  messages: [...state.messages, assistantMessage],
                  isStreaming: false,
                  streamingContent: '',
                  suggestedChanges: changes,
                }));
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err: any) {
      const errorMessage: AIChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `❌ 请求失败: ${err.message}`,
        timestamp: Date.now(),
      };
      set((state) => ({
        messages: [...state.messages, errorMessage],
        isStreaming: false,
        streamingContent: '',
      }));
    }
  },

  setMode: (mode) => set({ mode, isBatchMode: mode === 'batch' }),

  applyChange: (index) => {
    const changes = get().suggestedChanges;
    if (index >= 0 && index < changes.length) {
      // 这里触发保存到文件，通过 asset store 完成
      const newChanges = [...changes];
      newChanges.splice(index, 1);
      set({ suggestedChanges: newChanges });
    }
  },

  dismissChange: (index) => {
    const changes = get().suggestedChanges;
    const newChanges = [...changes];
    newChanges.splice(index, 1);
    set({ suggestedChanges: newChanges });
  },

  applyAllChanges: () => {
    set({ suggestedChanges: [] });
  },

  dismissAllChanges: () => {
    set({ suggestedChanges: [] });
  },

  clearMessages: () => set({ messages: [], suggestedChanges: [] }),
}));

/** 解析 PIXEL_CHANGE 块 */
function parsePixelChanges(content: string): { filePath?: string; pixelAsset: PixelAsset }[] {
  const changes: { filePath?: string; pixelAsset: PixelAsset }[] = [];

  const batchRegex = /<<<PIXEL_CHANGE\s+file="([^"]+)">>>\s*([\s\S]*?)<<<END_CHANGE>>>/g;
  let match;
  while ((match = batchRegex.exec(content)) !== null) {
    try {
      const pixelAsset = JSON.parse(match[2].trim());
      changes.push({ filePath: match[1], pixelAsset });
    } catch { /* skip */ }
  }

  if (changes.length === 0) {
    const singleRegex = /<<<PIXEL_CHANGE>>>\s*([\s\S]*?)<<<END_CHANGE>>>/g;
    while ((match = singleRegex.exec(content)) !== null) {
      try {
        const pixelAsset = JSON.parse(match[1].trim());
        changes.push({ pixelAsset });
      } catch { /* skip */ }
    }
  }

  return changes;
}
