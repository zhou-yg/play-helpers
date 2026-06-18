import React from 'react';
import { EditorMode } from '@/hooks/useEditorMode';

interface LeftToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

const modes: { mode: EditorMode; icon: string; label: string; shortcut: string }[] = [
  { mode: 'select', icon: '✋', label: 'Select', shortcut: 'S' },
  { mode: 'paint', icon: '🖌️', label: 'Paint', shortcut: 'P' },
  { mode: 'swap', icon: '🔄', label: 'Swap', shortcut: 'W' },
];

export default function LeftToolbar({ mode, onModeChange }: LeftToolbarProps) {
  return (
    <div className="mode-buttons-v">
      {modes.map((m) => (
        <button
          key={m.mode}
          className={`mode-btn-v ${mode === m.mode ? 'active' : ''}`}
          onClick={() => onModeChange(m.mode)}
          title={`${m.label} (${m.shortcut})`}
        >
          <div>{m.icon}</div>
          <div className="mode-label">{m.shortcut}</div>
        </button>
      ))}
    </div>
  );
}
