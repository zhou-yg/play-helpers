import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Opens the native OS folder picker.
 * macOS: osascript + AppleScript "choose folder".
 */
export async function POST() {
  if (process.platform !== "darwin") {
    return NextResponse.json(
      {
        error:
          "folder picker is only supported on macOS in this build — enter the path manually",
      },
      { status: 501 }
    );
  }
  try {
    const script = `
      tell application "System Events"
        activate
      end tell
      set chosenFolder to choose folder with prompt "Select workspace folder"
      return POSIX path of chosenFolder
    `;
    const { stdout } = await execFileAsync("osascript", ["-e", script]);
    const p = stdout.trim().replace(/\/$/, "");
    return NextResponse.json({ path: p });
  } catch (e) {
    // user cancelled or denied automation permission
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("-128") || /cancel/i.test(msg)) {
      return NextResponse.json({ path: null });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
