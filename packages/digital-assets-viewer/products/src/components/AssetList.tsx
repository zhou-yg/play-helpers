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

export default function AssetList() {
  const { assets, currentDir, root, selected, allTags, activeTags } =
    useWorkspaceState();
  const { selectAsset, toggleTagFilter, clearTagFilters } = useWorkspaceActions();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("added");

  const inDir = useMemo(() => {
    const base = currentDir ?? root;
    if (!base) return [];
    return assets.filter((a) => {
      const parent = a.path.slice(0, a.path.lastIndexOf("/"));
      return parent === base;
    });
  }, [assets, currentDir, root]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = inDir;
    if (activeTags.length > 0) {
      list = list.filter((a) => activeTags.every((t) => a.tags.includes(t)));
    }
    if (q) {
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    const sorted = [...list];
    if (sortKey === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => b.mtime - a.mtime); // newest first (default)
    }
    return sorted;
  }, [inDir, query, activeTags, sortKey]);

  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="flex flex-col gap-2 border-b border-zinc-800 p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索文件名或标签…"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-1.5 pl-8 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none"
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

        {/* tags quick filter — global tags, always rendered */}
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
              {activeTags.length > 0 && (
                <button
                  onClick={clearTagFilters}
                  className="ml-1 text-[11px] text-zinc-500 hover:text-zinc-300"
                >
                  清除筛选
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto p-2">
        {shown.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            {inDir.length === 0 ? "此文件夹为空" : "没有匹配的文件"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-600">
                <th className="px-2 py-1.5 font-medium">名称</th>
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
