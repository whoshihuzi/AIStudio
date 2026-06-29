// ============================================================
// WorkspaceService — proxy to WorkspaceProvider.
// Future: aggregates SearchProvider, SymbolProvider here.
// ============================================================

import { WorkspaceProvider } from "./WorkspaceProvider.js";
import type { IWorkspaceProvider, FileContent, FileStat, DirectoryEntry, SearchResult, GlobResult } from "./types.js";

export class WorkspaceService implements IWorkspaceProvider {
  private readonly provider = new WorkspaceProvider();

  readFile(path: string): FileContent { return this.provider.readFile(path); }
  writeFile(path: string, content: string): void { this.provider.writeFile(path, content); }
  exists(path: string): boolean { return this.provider.exists(path); }
  stat(path: string): FileStat { return this.provider.stat(path); }
  listDirectory(path: string): DirectoryEntry[] { return this.provider.listDirectory(path); }
  glob(pattern: string): GlobResult { return this.provider.glob(pattern); }
  searchText(query: string, opts?: Parameters<IWorkspaceProvider["searchText"]>[1]): SearchResult {
    return this.provider.searchText(query, opts);
  }
}

export const workspaceService = new WorkspaceService();
