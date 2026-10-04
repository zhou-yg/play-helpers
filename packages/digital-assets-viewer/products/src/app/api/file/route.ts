import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  tiff: "image/tiff",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
};

/** Streams a file from the workspace for preview. */
export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "missing path" }, { status: 400 });
  }
  const abs = path.resolve(filePath);
  try {
    const stat = await fs.stat(abs);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "not a file" }, { status: 400 });
    }
    const ext = abs.slice(abs.lastIndexOf(".") + 1).toLowerCase();
    const type = MIME[ext] ?? "application/octet-stream";
    const data = await fs.readFile(abs);
    // support range requests loosely (video seeking) via full-buffer response
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(stat.size),
        "Cache-Control": "no-store",
        "Accept-Ranges": "none",
      },
    });
  } catch {
    return NextResponse.json({ error: `file not found: ${abs}` }, { status: 404 });
  }
}
