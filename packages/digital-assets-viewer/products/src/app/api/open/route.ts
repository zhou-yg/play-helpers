import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

/** Opens a folder (or file's parent) in the system file manager. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const target = body?.path;
  if (typeof target !== "string" || !target) {
    return NextResponse.json({ error: "missing path" }, { status: 400 });
  }
  const resolved = path.resolve(target);
  try {
    if (process.platform === "darwin") {
      await execFileAsync("open", [resolved]);
    } else if (process.platform === "win32") {
      await execFileAsync("explorer", [resolved]);
    } else {
      await execFileAsync("xdg-open", [resolved]);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
