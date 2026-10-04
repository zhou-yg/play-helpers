export type AssetKind = "image" | "model" | "audio" | "video" | "other";

export interface FileEntry {
  name: string;
  path: string; // absolute path
  relPath: string; // path relative to workspace root
  ext: string;
  kind: AssetKind;
  size: number;
  mtime: number; // ms epoch
  isDirectory: boolean;
}

export interface Asset extends FileEntry {
  tags: string[];
}

export interface DirNode {
  name: string;
  path: string;
  /** recursive file count inside this directory (including subdirectories) */
  fileCount: number;
  children: DirNode[];
}

/** Metadata sidecar file: <workspace>/.dig-viewer/meta.json */
export interface WorkspaceMeta {
  tags?: Record<string, string[]>;
}
