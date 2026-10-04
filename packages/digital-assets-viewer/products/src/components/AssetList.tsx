"use client";

import { useMemo, useState } from "react";
import type { Asset } from "@/lib/types";
import { KIND_LABEL, formatDate, formatSize } from "@/lib/asset-kinds";
import { useWorkspaceActions, useWorkspaceState } from "@/lib/workspace-store";

type SortKey = "added" | "name";

const KIND_ICON: Record<string, string> = {
  image: "🖼️",
  model: "🧊",
  audio: "🎵",
  video: "🎬",
  other: "📄",
};

/** Relative directory of an asset (relative to root, "" for root files). */
function dirLabel(a: Asset, root: string | null): string {
  if (!root) return "";
  const rel = a.relPath.includes("/")
    ? a.relPath.slice(0, a.relPath.lastIndexOf("/"))
    : "";
  return rel || "";
}

export default function AssetList() {
  const {
    root,
    currentDir,
    assets,
    filteredAssets,
    hasFilter,
    selected,
    allTags,
    activeTags,
    query,
  } = useWorkspaceState();
  const {
    selectAsset,
    toggleTagFilter,
    clearTagFilters,
    setQuery,
  } = useWorkspaceActions();
  const [sortKey, setSortKey] = useState<SortKey>("added");

  /** files of the currently open folder (no filter) */
  const inDir = useMemo(() => {
    const base = currentDir ?? root;
    if (!base) return [];
    return assets.filter((a) => {
      const parent = a.path.slice(0, a.path.lastIndexOf("/"));
      return parent === base;
    });
  }, [assets, currentDir, root]);

  /** global search mode shows every matching file in the workspace */
  const listing = hasFilter ? filteredAssets : inDir;

  const shown = useMemo(() => {
    const sorted = [...listing];
    if (sortKey === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => b.mtime - a.mtime); // newest first (default)
    }
    return sorted;
  }, [listing, sortKey]);

  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="flex flex-col gap-2 border-b border-zinc-800 p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="全局搜索文件名或标签…"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-1.5 pl-8 pr-8 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none"
            />
            <svg
              viewBox="0 0 20 20"
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.4l3.07 3.08a1 1 0 01-1.4 1.4l-3.08-3.07A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                title="清空搜索"
              >
                ×
              </button>
            )}
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 focus:border-sky-600 focus:outline-none"
          >
            <option value="added">最近修改</option>
            <option value="name">A-Z</option>
          </select>
        </div>

        {/* tags quick filter — global, always rendered */}
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-[11px] uppercase tracking-wider text-zinc-600">
            标签
          </span>
          {allTags.length === 0 ? (
            <span className="text-xs text-zinc-600">无</span>
          ) : (
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTagFilter(t)}
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    activeTags.includes(t)
                      ? "bg-sky-500/20 text-sky-300 ring-1 ring-inset ring-sky-500/50"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  #{t}
                </button>
              ))}
              {(activeTags.length > 0 || query) && (
                <button
                  onClick={() => {
                    clearTagFilters();
                    setQuery("");
                  }}
                  className="ml-1 text-[11px] text-zinc-500 hover:text-zinc-300"
                >
                  清除筛选
                </button>
              )}
            </div>
          )}
        </div>

        {/* status line in global-search mode */}
        {hasFilter && (
          <div className="text-[11px] text-zinc-500">
            全局搜索：命中 {filteredAssets.length} / {assets.length} 个文件
          </div>
        )}
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto p-2">
        {shown.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            {hasFilter
              ? "没有匹配的文件"
              : inDir.length === 0
                ? "此文件夹为空"
                : "没有匹配的文件"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-600">
                <th className="px-2 py-1.5 font-medium">名称</th>
                {hasFilter && <th className="px-2 py-1.5 font-medium">位置</th>}
                <th className="px-2 py-1.5 font-medium">类型</th>
                <th className="px-2 py-1.5 font-medium">标签</th>
                <th className="px-2 py-1.5 font-medium">大小</th>
                <th className="px-2 py-1.5 font-medium">修改时间</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr
                  key={a.path}
                  onClick={() => selectAsset(a.path)}
                  className={`cursor-pointer border-t border-zinc-800/60 ${
                    selected === a.path
                      ? "bg-sky-500/10 text-sky-200"
                      : "text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                >
                  <td className="max-w-[260px] truncate px-2 py-1.5">
                    <span className="mr-1.5">{KIND_ICON[a.kind]}</span>
                    {a.name}
                  </td>
                  {hasFilter && (
                    <td
                      className="max-w-[180px] truncate px-2 py-1.5 text-xs text-zinc-500"
                      title={dirLabel(a, root)}
                    >
                      {dirLabel(a, root) || "根目录"}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs text-zinc-500">
                    {KIND_LABEL[a.kind]}
                  </td>
                  <td className="max-w-[180px] truncate px-2 py-1.5">
                    <span className="flex gap-1 overflow-hidden">
                      {a.tags.map((t) => (
                        <span
                          key={t}
                          className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs text-zinc-500">
                    {formatSize(a.size)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs text-zinc-500">
                    {formatDate(a.mtime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
