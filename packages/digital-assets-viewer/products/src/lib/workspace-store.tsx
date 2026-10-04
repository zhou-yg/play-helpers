"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Asset, DirNode } from "./types";

export interface WorkspaceState {
  /** chosen workspace root (absolute path); null until picked */
  root: string | null;
  /** absolute path of the currently selected folder (defaults to root) */
  currentDir: string | null;
  dirTree: DirNode | null;
  /** all files under root (recursive) */
  assets: Asset[];
  /** absolute path of the selected file, or null */
  selected: string | null;
  /** globally active tag filters (selected in the middle toolbar) */
  activeTags: string[];
  /** all distinct tags present anywhere in the workspace */
  allTags: string[];
  isScanning: boolean;
  error: string | null;
}

export interface WorkspaceActions {
  pickRoot: () => Promise<void>;
  selectDir: (path: string) => void;
  selectAsset: (path: string | null) => void;
  refresh: () => Promise<void>;
  openInFinder: (path: string) => Promise<void>;
  setTags: (filePath: string, tags: string[]) => Promise<void>;
  toggleTagFilter: (tag: string) => void;
  clearTagFilters: () => void;
}

const StateContext = createContext<WorkspaceState | null>(null);
const ActionsContext = createContext<WorkspaceActions | null>(null);

export function useWorkspaceState(): WorkspaceState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useWorkspaceState must be used inside WorkspaceProvider");
  return ctx;
}

export function useWorkspaceActions(): WorkspaceActions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error("useWorkspaceActions must be used inside WorkspaceProvider");
  return ctx;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return json as T;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [root, setRoot] = useState<string | null>(null);
  const [currentDir, setCurrentDir] = useState<string | null>(null);
  const [dirTree, setDirTree] = useState<DirNode | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoot = useCallback(async (path: string) => {
    setIsScanning(true);
    setError(null);
    try {
      const data = await api<{ root: string; tree: DirNode; assets: Asset[] }>(
        `/api/scan?root=${encodeURIComponent(path)}`
      );
      setRoot(data.root);
      setDirTree(data.tree);
      setAssets(data.assets);
      setCurrentDir((prev) => prev ?? data.root);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsScanning(false);
    }
  }, []);

  const pickRoot = useCallback(async () => {
    setError(null);
    try {
      const picked = await api<{ path: string | null }>("/api/pick-folder", {
        method: "POST",
      });
      if (!picked.path) return; // user cancelled
      setCurrentDir(null);
      setSelected(null);
      setActiveTags([]);
      await loadRoot(picked.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [loadRoot]);

  const refresh = useCallback(async () => {
    if (root) await loadRoot(root);
  }, [root, loadRoot]);

  const selectDir = useCallback((path: string) => {
    setCurrentDir(path);
    setSelected(null);
  }, []);

  const selectAsset = useCallback((path: string | null) => {
    setSelected(path);
  }, []);

  const openInFinder = useCallback(async (path: string) => {
    await api("/api/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  }, []);

  const setTags = useCallback(
    async (filePath: string, tags: string[]) => {
      setAssets((prev) =>
        prev.map((a) => (a.path === filePath ? { ...a, tags } : a))
      );
      try {
        await api("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ root, path: filePath, tags }),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        // reload server truth
        if (root) await loadRoot(root);
      }
    },
    [root, loadRoot]
  );

  const toggleTagFilter = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const clearTagFilters = useCallback(() => setActiveTags([]), []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const a of assets) a.tags.forEach((t) => s.add(t));
    return Array.from(s).sort();
  }, [assets]);

  const state = useMemo<WorkspaceState>(
    () => ({
      root,
      currentDir,
      dirTree,
      assets,
      selected,
      activeTags,
      allTags,
      isScanning,
      error,
    }),
    [root, currentDir, dirTree, assets, selected, activeTags, allTags, isScanning, error]
  );

  const actions = useMemo<WorkspaceActions>(
    () => ({
      pickRoot,
      selectDir,
      selectAsset,
      refresh,
      openInFinder,
      setTags,
      toggleTagFilter,
      clearTagFilters,
    }),
    [pickRoot, selectDir, selectAsset, refresh, openInFinder, setTags, toggleTagFilter, clearTagFilters]
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}
