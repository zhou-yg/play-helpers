"use client";

import {
  WorkspaceProvider,
  useWorkspaceActions,
  useWorkspaceState,
} from "@/lib/workspace-store";
import TopBar from "@/components/TopBar";
import FileTree from "@/components/FileTree";
import AssetList from "@/components/AssetList";
import PreviewPane from "@/components/PreviewPane";

function EmptyState() {
  const { pickRoot } = useWorkspaceActions();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="text-5xl">📁</div>
      <div className="text-sm text-zinc-500">
        尚未选择工作区文件夹
      </div>
      <button
        onClick={() => void pickRoot()}
        className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
      >
        选择文件夹
      </button>
    </div>
  );
}

function HomeContent() {
  const { root, isScanning, error } = useWorkspaceState();
  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      {error && (
        <div className="bg-red-500/10 px-4 py-1.5 text-xs text-red-300">
          {error}
        </div>
      )}
      {isScanning ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          扫描中…
        </div>
      ) : !root ? (
        <div className="flex-1">
          <EmptyState />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900/40">
            <FileTree />
          </aside>
          <main className="min-w-0 flex-1 border-r border-zinc-800">
            <AssetList />
          </main>
          <aside className="w-[380px] shrink-0 bg-zinc-900/40">
            <PreviewPane />
          </aside>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <WorkspaceProvider>
      <HomeContent />
    </WorkspaceProvider>
  );
}
