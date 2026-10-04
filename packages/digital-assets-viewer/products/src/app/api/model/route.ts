import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ktx2: "image/ktx2",
};

function isDataUri(uri: string): boolean {
  return /^data:/i.test(uri);
}

/** Escapes a URI component per RFC 3986 (gltf uri can be percent-encoded). */
function decodeGltfUri(uri: string): string {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
}

function toDataUri(buf: Buffer, mime: string): string {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * Serves a .gltf file with all external buffers and images inlined as
 * data URIs, so the viewer can load it without relative-path resolution.
 */
export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "missing path" }, { status: 400 });
  }
  const abs = path.resolve(filePath);
  const baseDir = path.dirname(abs);

  let gltf: {
    buffers?: { uri?: string }[];
    images?: { uri?: string }[];
  };
  try {
    gltf = JSON.parse(await fs.readFile(abs, "utf-8"));
  } catch {
    return NextResponse.json({ error: `cannot read gltf: ${abs}` }, { status: 404 });
  }

  const cache = new Map<string, string>(); // abs path -> data uri
  const inline = async (uri: string): Promise<string | null> => {
    if (!uri || isDataUri(uri)) return null; // null = leave as-is
    const file = path.resolve(baseDir, decodeGltfUri(uri));
    if (cache.has(file)) return cache.get(file)!;
    try {
      const ext = file.slice(file.lastIndexOf(".") + 1).toLowerCase();
      const mime = MIME[ext] ?? "application/octet-stream";
      const data = await fs.readFile(file);
      const inlineUri = toDataUri(data, mime);
      cache.set(file, inlineUri);
      return inlineUri;
    } catch {
      console.warn(`[model] missing external resource: ${file}`);
      return null;
    }
  };

  // inline buffers
  if (Array.isArray(gltf.buffers)) {
    for (const b of gltf.buffers) {
      if (b?.uri) {
        const inlined = await inline(b.uri);
        if (inlined) b.uri = inlined;
      }
    }
  }
  // inline images
  if (Array.isArray(gltf.images)) {
    for (const img of gltf.images) {
      if (img?.uri) {
        const inlined = await inline(img.uri);
        if (inlined) img.uri = inlined;
      }
    }
  }

  return new NextResponse(JSON.stringify(gltf), {
    status: 200,
    headers: {
      "Content-Type": "model/gltf+json",
      "Cache-Control": "no-store",
    },
  });
}
