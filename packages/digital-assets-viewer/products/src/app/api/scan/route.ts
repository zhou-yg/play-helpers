import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { Asset, DirNode, WorkspaceMeta } from "@/lib/types";
import { extOf, kindOf } from "@/lib/asset-kinds";

const META_DIR = ".dig-viewer";
const META_FILE = "meta.json";

function listDirSafe(dir: string, withFileTypes: true): Promise<DirentResult[]>;
function listDirSafe(dir: string, withFileTypes?: false): Promise<string[]>;
async function listDirSafe(
  dir: string,
  withFileTypes?: boolean
): Promise<DirentResult[] | string[]> {
  try {
    return await fs.readdir(dir, { withFileTypes: true } as never);
  } catch {
    return [];
  }
}

interface DirentResult {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

async function readMeta(root: string): Promise<WorkspaceMeta> {
  try {
    const raw = await fs.readFile(
      path.join(root, META_DIR, META_FILE),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.tags) return parsed;
    return {};
  } catch {
    return {};
  }
}

async function buildTree(
  root: string,
  dir: string,
  name: string,
  tags: Record<string, string[]>,
  assets: Asset[]
): Promise<DirNode> {
  const entries = (await listDirSafe(dir, true)) as DirentResult[];
  const children: DirNode[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const childPath = path.join(dir, e.name);
    const child = await buildTree(root, childPath, e.name, tags, assets);
    children.push(child);
  }
  // attach files of this dir to assets
  let ownFileCount = 0;
  for (const e of entries) {
    if (!e.isFile()) continue;
    const full = path.join(dir, e.name);
    let st;
    try {
      st = await fs.stat(full);
    } catch {
      continue;
    }
    ownFileCount++;
    const rel = path.relative(root, full);
    assets.push({
      name: e.name,
      path: full,
      relPath: rel,
      ext: extOf(e.name),
      kind: kindOf(e.name),
      size: st.size,
      mtime: st.mtimeMs,
      isDirectory: false,
      tags: tags[full] ?? [],
    });
  }
  children.sort((a, b) => a.name.localeCompare(b.name));
  const fileCount =
    ownFileCount + children.reduce((sum, c) => sum + c.fileCount, 0);
  return { name, path: dir, fileCount, children };
}

export async function GET(req: NextRequest) {
  const rootParam = req.nextUrl.searchParams.get("root");
  if (!rootParam) {
    return NextResponse.json({ error: "missing root" }, { status: 400 });
  }
  const root = path.resolve(rootParam);
  try {
    const st = await fs.stat(root);
    if (!st.isDirectory()) {
      return NextResponse.json(
        { error: `not a directory: ${root}` },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: `directory not found: ${root}` },
      { status: 404 }
    );
  }

  const meta = await readMeta(root);
  const tags = meta.tags ?? {};
  const assets: Asset[] = [];
  const tree = await buildTree(root, root, path.basename(root) || root, tags, assets);

  assets.sort((a, b) => b.mtime - a.mtime);

  return NextResponse.json({ root, tree, assets });
}
