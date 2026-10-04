"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspaceActions, useWorkspaceState } from "@/lib/workspace-store";
import { KIND_LABEL, formatDate, formatSize } from "@/lib/asset-kinds";
import ModelPreview from "./ModelPreview";

function fileUrl(path: string): string {
  return `/api/file?path=${encodeURIComponent(path)}`;
}

function ImagePreview({ src, name }: { src: string; name: string }) {
  return (
    <img
      src={src}
      alt={name}
      className="max-h-full max-w-full object-contain"
    />
  );
}

function AudioPreview({ src }: { src: string }) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-4xl">
        🎵
      </div>
      <audio src={src} controls className="w-full" />
    </div>
  );
}

function VideoPreview({ src }: { src: string }) {
  return (
    <video src={src} controls className="max-h-full max-w-full" />
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = (raw: string) => {
    const t = raw.trim().replace(/^#/, "");
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="group inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300 ring-1 ring-inset ring-sky-500/40"
          >
            #{t}
            <button
              onClick={() => onChange(tags.filter((x) => x !== t))}
              className="text-sky-400/60 hover:text-sky-200"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs text-zinc-600">暂无标签</span>
        )}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(input);
            setInput("");
          } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        placeholder="输入标签，回车添加（如 hero, ui, sfx）"
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none"
      />
    </div>
  );
}

export default function PreviewPane() {
  const { assets, selected } = useWorkspaceState();
  const { setTags, openInFinder } = useWorkspaceActions();
  const asset = useMemo(
    () => assets.find((a) => a.path === selected) ?? null,
    [assets, selected]
  );

  if (!asset) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-600">
        选择一个文件进行预览
      </div>
    );
  }

  const src = fileUrl(asset.path);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-zinc-950 p-4">
        {asset.kind === "image" && <ImagePreview src={src} name={asset.name} />}
        {asset.kind === "audio" && <AudioPreview src={src} />}
        {asset.kind === "video" && <VideoPreview src={src} />}
        {asset.kind === "model" && <ModelPreview src={src} />}
        {asset.kind === "other" && (
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <span className="text-4xl">📄</span>
            <span className="text-sm">不支持预览的文件类型</span>
          </div>
        )}
      </div>
      <div className="shrink-0 space-y-3 border-t border-zinc-800 p-3">
        <div>
          <div className="mb-1 truncate text-sm font-medium text-zinc-200" title={asset.name}>
            {asset.name}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>{KIND_LABEL[asset.kind]} · {asset.ext.toUpperCase()}</span>
            <span>{formatSize(asset.size)}</span>
            <span>{formatDate(asset.mtime)}</span>
            <button
              onClick={() => void openInFinder(asset.path)}
              className="text-sky-400 hover:text-sky-300"
            >
              在 Finder 中显示
            </button>
          </div>
        </div>
        <TagEditor tags={asset.tags} onChange={(t) => void setTags(asset.path, t)} />
      </div>
    </div>
  );
}
