import { useState, useCallback } from 'react';

export type EditorMode = 'select' | 'paint' | 'swap';

export function useEditorMode() {
  const [mode, setMode] = useState<EditorMode>('select');

  const changeMode = useCallback((newMode: EditorMode) => {
    setMode(newMode);
  }, []);

  return { mode, setMode: changeMode };
}
