import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { WorkspaceMeta } from "@/lib/types";

const META_DIR = ".dig-viewer";
const META_FILE = "meta.json";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const root = body?.root;
  const filePath = body?.path;
  const tags = body?.tags;
  if (typeof root !== "string" || typeof filePath !== "string" || !Array.isArray(tags)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const rootDir = path.resolve(root);
  // normalize: absolute file path must be inside root
  const abs = path.resolve(filePath);
  if (!abs.startsWith(rootDir)) {
    return NextResponse.json(
      { error: "file is outside the workspace root" },
      { status: 400 }
    );
  }

  const metaPath = path.join(rootDir, META_DIR, META_FILE);
  let meta: WorkspaceMeta = {};
  try {
    meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
  } catch {
    meta = {};
  }
  meta.tags = meta.tags ?? {};
  const clean = tags
    .filter((t: unknown): t is string => typeof t === "string")
    .map((t: string) => t.trim())
    .filter(Boolean);
  if (clean.length === 0) delete meta.tags[abs];
  else meta.tags[abs] = Array.from(new Set(clean));

  try {
    await fs.mkdir(path.dirname(metaPath), { recursive: true });
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
    return NextResponse.json({ ok: true, tags: meta.tags[abs] ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
