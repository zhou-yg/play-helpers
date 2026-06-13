import React, { useState, useRef, useEffect } from 'react';
import { useAIStore } from '../../stores/ai-store';
import { useAssetStore } from '../../stores/asset-store';

const QUICK_COMMANDS = [
  { label: '🎨 换色', cmd: '请将素材中所有指定的颜色替换为目标颜色' },
  { label: '🔄 水平镜像', cmd: '请将素材水平翻转（沿垂直中轴线镜像）' },
  { label: '🔄 垂直镜像', cmd: '请将素材垂直翻转（沿水平中轴线镜像）' },
  { label: '📏 放大2x', cmd: '请将素材放大2倍，每个像素扩展为2x2' },
  { label: '🎭 风格化-复古', cmd: '请将素材转换为复古色调风格' },
  { label: '✨ 优化', cmd: '请优化素材的像素细节：平滑锯齿、优化轮廓' },
  { label: '🧹 清理', cmd: '请清理素材中的孤立像素' },
  { label: '🔲 描边', cmd: '请为素材中所有非透明像素添加1px的黑色描边轮廓' },
  { label: '🔃 反色', cmd: '请将素材中所有非透明像素取反色' },
  { label: '🔄 旋转90°', cmd: '请将素材顺时针旋转90度' },
];

const AIChatPanel: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    isOpen,
    messages,
    isStreaming,
    streamingContent,
    suggestedChanges,
    sendMessage,
    closePanel,
    applyChange,
    dismissChange,
    applyAllChanges,
    dismissAllChanges,
    mode,
    isBatchMode,
  } = useAIStore();
  const { editingAssetPath, editingAssetData } = useAssetStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  if (!embedded && !isOpen) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    const context = editingAssetPath && editingAssetData
      ? { assetPath: editingAssetPath, assetData: editingAssetData }
      : undefined;
    sendMessage(input.trim(), context);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickCmd = (cmd: string) => {
    const context = editingAssetPath && editingAssetData
      ? { assetPath: editingAssetPath, assetData: editingAssetData }
      : undefined;
    sendMessage(cmd, context);
  };

  return (
    <div className="ai-chat-panel">
      {!embedded && (
        <div className="ai-chat-header">
          🤖 AI 助手 {isBatchMode ? '- 批量模式' : ''}
          <button style={{ float: 'right', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={closePanel}>✕</button>
        </div>
      )}

      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="chat-message assistant">
            🤖 你好！我可以帮你编辑像素素材。试试说：
            <br />"把帽子改成蓝色"
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            {msg.role === 'user' ? '👤 ' : '🤖 '}
            {msg.content}
          </div>
        ))}
        {isStreaming && streamingContent && (
          <div className="chat-message assistant">
            🤖 {streamingContent}
            <span style={{ animation: 'blink 1s infinite' }}>▊</span>
          </div>
        )}

        {suggestedChanges.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {suggestedChanges.map((change, i) => (
              <div key={i} className="suggested-change">
                📄 {change.filePath || '素材变更'}
                <div className="suggested-change-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => applyChange(i)}>应用</button>
                  <button className="btn btn-sm" onClick={() => dismissChange(i)}>忽略</button>
                </div>
              </div>
            ))}
            {suggestedChanges.length > 1 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button className="btn btn-sm btn-primary" onClick={applyAllChanges}>全部应用</button>
                <button className="btn btn-sm" onClick={dismissAllChanges}>全部忽略</button>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="quick-commands">
        {QUICK_COMMANDS.map((qc, i) => (
          <span key={i} className="quick-cmd" onClick={() => handleQuickCmd(qc.cmd)}>
            {qc.label}
          </span>
        ))}
      </div>

      <div className="ai-chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={isStreaming}
        />
        <button onClick={handleSend} disabled={isStreaming || !input.trim()}>
          发送
        </button>
      </div>
    </div>
  );
};

export default AIChatPanel;
