// ============================================================
// WorkspaceIndexStore — in-memory index for workspace metadata.
// No search algorithms. No content indexing. Metadata only.
// ============================================================

import { WorkspaceIndexer, type IndexEntry, type IndexStats } from "./WorkspaceIndexer.js";
import type { IWorkspaceProvider } from "./types.js";

export class WorkspaceIndexStore {
  private entries: IndexEntry[] = [];
  private lastStats: IndexStats | null = null;
  private readonly indexer: WorkspaceIndexer;

  constructor(ws: IWorkspaceProvider) {
    this.indexer = new WorkspaceIndexer(ws);
  }

  /** Rebuild the index from scratch. */
  rebuild(): IndexStats {
    const result = this.indexer.scanWithStats("");
    this.entries = result.entries;
    this.lastStats = result.stats;
    return result.stats;
  }

  /** Return all indexed entries. */
  getAll(): IndexEntry[] {
    return this.entries;
  }

  /** Find a single entry by exact path. */
  findByPath(path: string): IndexEntry | undefined {
    return this.entries.find((e) => e.path === path);
  }

  /** Find entries whose name contains the query (case-insensitive). */
  findByName(query: string): IndexEntry[] {
    const q = query.toLowerCase();
    return this.entries.filter((e) => e.name.toLowerCase().includes(q));
  }

  /** Get stats from the last rebuild. */
  getStats(): IndexStats | null {
    return this.lastStats;
  }
}
