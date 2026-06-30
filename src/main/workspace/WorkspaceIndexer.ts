// ============================================================
// WorkspaceIndexer — recursively scans workspace metadata.
// Calls WorkspaceProvider only. No direct fs access.
// ============================================================

import type { IWorkspaceProvider, FileStat } from "../workspace/types.js";

export interface IndexEntry {
  path: string;
  name: string;
  extension: string;
  size: number;
  mtime: number;
  isDirectory: boolean;
}

export interface IndexStats {
  totalFiles: number;
  totalDirectories: number;
  totalEntries: number;
  scanDurationMs: number;
}

export class WorkspaceIndexer {
  constructor(private readonly ws: IWorkspaceProvider) {}

  /** Recursively scan the workspace and return all entries. */
  scan(root = ""): IndexEntry[] {
    const entries: IndexEntry[] = [];
    this.walk(root, entries);
    return entries;
  }

  /** Scan and return with timing stats. */
  scanWithStats(root = ""): { entries: IndexEntry[]; stats: IndexStats } {
    const start = Date.now();
    const entries = this.scan(root);
    const stats: IndexStats = {
      totalFiles: entries.filter((e) => !e.isDirectory).length,
      totalDirectories: entries.filter((e) => e.isDirectory).length,
      totalEntries: entries.length,
      scanDurationMs: Date.now() - start,
    };
    return { entries, stats };
  }

  // ----------------------------------------------------------
  // Internal
  // ----------------------------------------------------------

  private walk(relPath: string, out: IndexEntry[]): void {
    const list = this.ws.listDirectory(relPath);
    for (const child of list) {
      if (this.isHidden(child.name)) continue;
      const st = this.ws.stat(child.path);
      out.push({
        path: child.path,
        name: child.name,
        extension: this.extractExtension(child.name),
        size: st.isFile ? st.size : 0,
        mtime: st.modifiedAt,
        isDirectory: st.isDirectory,
      });
      if (st.isDirectory) {
        this.walk(child.path, out);
      }
    }
  }

  private isHidden(name: string): boolean {
    return name.startsWith(".") || name === "node_modules" || name === "dist" ||
      name === "out" || name === "coverage" || name === "__pycache__";
  }

  private extractExtension(name: string): string {
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  }
}
