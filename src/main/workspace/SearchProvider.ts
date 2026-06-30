// ============================================================
// SearchProvider — metadata-only search on WorkspaceIndexStore.
// No content, no fuzzy, no regex, no filesystem access.
// ============================================================

import type { WorkspaceIndexStore } from "./WorkspaceIndexStore.js";
import type { IndexEntry } from "./WorkspaceIndexer.js";

export interface SearchResult {
  path: string;
  name: string;
  extension: string;
  isDirectory: boolean;
  score: number;
}

export class SearchProvider {
  constructor(private readonly index: WorkspaceIndexStore) {}

  /** Exact name match (case-insensitive). */
  findByExactName(name: string, limit = 100): SearchResult[] {
    const q = name.toLowerCase();
    const results: SearchResult[] = [];
    for (const e of this.index.getAll()) {
      if (e.name.toLowerCase() === q) {
        results.push(toResult(e, 3));
      }
    }
    return this.sortAndLimit(results, limit);
  }

  /** Name starts with the prefix (case-insensitive). */
  findByPrefix(prefix: string, limit = 100): SearchResult[] {
    const q = prefix.toLowerCase();
    const results: SearchResult[] = [];
    for (const e of this.index.getAll()) {
      if (e.name.toLowerCase().startsWith(q)) {
        results.push(toResult(e, 2));
      }
    }
    return this.sortAndLimit(results, limit);
  }

  /** Name contains the substring (case-insensitive). */
  findBySubstring(text: string, limit = 100): SearchResult[] {
    const q = text.toLowerCase();
    const results: SearchResult[] = [];
    for (const e of this.index.getAll()) {
      if (e.name.toLowerCase().includes(q)) {
        // Dedup with exact/prefix: give lower score
        const already = results.some((r) => r.path === e.path);
        if (!already) results.push(toResult(e, 1));
      }
    }
    return this.sortAndLimit(results, limit);
  }

  /** Extension match (case-insensitive, no dot). */
  findByExtension(ext: string, limit = 100): SearchResult[] {
    const q = ext.toLowerCase();
    const results: SearchResult[] = [];
    for (const e of this.index.getAll()) {
      if (e.extension === q) {
        results.push(toResult(e, 1));
      }
    }
    return this.sortAndLimit(results, limit);
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private sortAndLimit(results: SearchResult[], limit: number): SearchResult[] {
    return results
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, limit);
  }
}

function toResult(e: IndexEntry, score: number): SearchResult {
  return { path: e.path, name: e.name, extension: e.extension, isDirectory: e.isDirectory, score };
}
