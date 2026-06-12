import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TopToolbar from './components/TopToolbar';
import AssetBar from './components/AssetBar';
import CanvasArea from './components/CanvasArea';
import EditDialog from './components/EditDialog';
import SettingsPanel from './components/SettingsPanel';
import SceneEditor from './components/SceneEditor';
import AIChatPanel from './components/AIChatPanel';
import { useSceneStore } from './stores/scene-store';
import { useConfigStore } from './stores/config-store';
import { useEditorStore } from './stores/editor-store';

const App: React.FC = () => {
  const { isSceneMode } = useSceneStore();
  const { fetchConfig } = useConfigStore();

  React.useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-layout">
        <TopToolbar />
        <div className="app-main">
          <AssetBar />
          {isSceneMode ? <SceneEditor /> : <CanvasArea />}
          <AIChatPanel />
        </div>
        <EditDialog />
      </div>
    </DndProvider>
  );
};

export default App;
