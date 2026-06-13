/**
 * AI 对话状态管理
 */
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AIChatMessage, PixelAsset } from '../types';
import { getApiUrl } from '../lib/api';
import { useAssetStore } from './asset-store';

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
      let assistantMessageAdded = false;

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
              if (data.done && !assistantMessageAdded) {
                assistantMessageAdded = true;
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

      // 兜底：如果流结束但 done 事件未触发，确保恢复状态
      if (!assistantMessageAdded && fullContent) {
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
      } else if (!assistantMessageAdded) {
        set({ isStreaming: false, streamingContent: '' });
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
      const change = changes[index];
      const assetStore = useAssetStore.getState();
      // 优先使用变更中的 filePath，否则使用当前正在编辑的素材路径
      const targetPath = change.filePath || assetStore.editingAssetPath;
      if (targetPath) {
        // 调用 asset-store 保存变更到文件
        assetStore.updateAsset(targetPath, change.pixelAsset);
        // 同步更新编辑器中的素材数据
        if (assetStore.editingAssetPath === targetPath) {
          assetStore.setEditingAsset(targetPath, change.pixelAsset);
        }
        // 刷新素材列表
        assetStore.refreshAsset(targetPath);
      }
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
    const changes = get().suggestedChanges;
    const assetStore = useAssetStore.getState();
    for (const change of changes) {
      const targetPath = change.filePath || assetStore.editingAssetPath;
      if (targetPath) {
        assetStore.updateAsset(targetPath, change.pixelAsset);
        if (assetStore.editingAssetPath === targetPath) {
          assetStore.setEditingAsset(targetPath, change.pixelAsset);
        }
        assetStore.refreshAsset(targetPath);
      }
    }
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
