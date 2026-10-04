"use client";

import { useWorkspaceActions, useWorkspaceState } from "@/lib/workspace-store";

export default function TopBar() {
  const { root } = useWorkspaceState();
  const { pickRoot, openInFinder, refresh } = useWorkspaceActions();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-wide text-zinc-100">
          DIG-viewer
        </span>
        {root && (
          <span
            className="max-w-[280px] truncate text-xs text-zinc-500"
            title={root}
          >
            {root}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {root && (
          <button
            onClick={refresh}
            className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            title="Rescan workspace"
          >
            刷新
          </button>
        )}
        <button
          onClick={pickRoot}
          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          选择文件夹
        </button>
        <button
          onClick={() => {
            const target = root;
            if (target) void openInFinder(target);
          }}
          disabled={!root}
          className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Finder打开
        </button>
      </div>
    </header>
  );
}
