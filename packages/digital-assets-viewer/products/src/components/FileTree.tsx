"use client";

import { useMemo, useState } from "react";
import type { DirNode } from "@/lib/types";
import { useWorkspaceActions, useWorkspaceState } from "@/lib/workspace-store";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
      fill="currentColor"
    >
      <path d="M6 3l5 5-5 5V3z" />
    </svg>
  );
}

function FolderRow({
  node,
  depth,
  currentDir,
  onSelect,
  defaultOpen,
  matchedMap,
}: {
  node: DirNode;
  depth: number;
  currentDir: string | null;
  onSelect: (path: string) => void;
  defaultOpen: boolean;
  /** per-directory matching-file counts when tag filters are active (null = no filter) */
  matchedMap: Map<string, number> | null;
}) {
  const [userOpen, setUserOpen] = useState(defaultOpen);
  const active = currentDir === node.path;
  // auto-expand if the selection is inside this node
  const childActive =
    !!currentDir &&
    currentDir !== node.path &&
    (currentDir + "/").startsWith(node.path + "/");
  const expanded = userOpen || childActive;
  const matchedCount =
    matchedMap === null ? null : (matchedMap.get(node.path) ?? 0);

  return (
    <div>
      <div
        className={`group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm ${
          active
            ? "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/40"
            : "text-zinc-300 hover:bg-zinc-800/70"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => {
          onSelect(node.path);
          setUserOpen(true);
        }}
      >
        <button
          className="flex h-4 w-4 items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            setUserOpen(!expanded);
          }}
        >
          {node.children.length > 0 ? <Chevron open={expanded} /> : null}
        </button>
        <span className={expanded ? "text-amber-300/90" : "text-sky-400/80"}>
          ▸
        </span>
        <span className="truncate" title={node.path}>
          {node.name}
        </span>
        <span
          className={`ml-auto shrink-0 rounded px-1.5 text-[10px] tabular-nums ${
            matchedCount === null
              ? "bg-zinc-800 text-zinc-500"
              : "bg-sky-500/15 text-sky-300"
          }`}
        >
          {matchedCount === null ? node.fileCount : matchedCount}
        </span>
      </div>
      {expanded && (
        <div>
          {node.children.map((c) => (
            <FolderRow
              key={c.path}
              node={c}
              depth={depth + 1}
              currentDir={currentDir}
              onSelect={onSelect}
              defaultOpen={false}
              matchedMap={matchedMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree() {
  const { dirTree, currentDir, assets, activeTags } = useWorkspaceState();
  const { selectDir } = useWorkspaceActions();

  /**
   * When tag filters are active, compute per-directory counts of matching
   * files and hide folders that contain none.
   */
  const { matchedMap, visibleRoot } = useMemo(() => {
    if (!dirTree) return { matchedMap: null, visibleRoot: null };
    if (activeTags.length === 0) {
      return { matchedMap: null, visibleRoot: dirTree };
    }
    const map = new Map<string, number>();
    for (const a of assets) {
      if (!activeTags.every((t) => a.tags.includes(t))) continue;
      const parent = a.path.slice(0, a.path.lastIndexOf("/"));
      map.set(parent, (map.get(parent) ?? 0) + 1);
    }
    // propagate counts up the tree
    const propagate = (node: DirNode): number => {
      const own = map.get(node.path) ?? 0;
      let total = own;
      for (const c of node.children) {
        total += propagate(c);
      }
      map.set(node.path, total);
      return total;
    };
    propagate(dirTree);

    // prune folders without matches
    const prune = (node: DirNode): DirNode | null => {
      const total = map.get(node.path) ?? 0;
      if (total === 0) return null;
      const children = node.children
        .map((c) => prune(c))
        .filter((c): c is DirNode => c !== null);
      return { ...node, children };
    };
    const pruned = prune(dirTree);
    return { matchedMap: map, visibleRoot: pruned };
  }, [dirTree, assets, activeTags]);

  if (!visibleRoot) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-zinc-600">
        没有包含所选标签的文件夹
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-2">
      <FolderRow
        node={visibleRoot}
        depth={0}
        currentDir={currentDir}
        onSelect={selectDir}
        defaultOpen={false}
        matchedMap={matchedMap}
      />
    </div>
  );
}
