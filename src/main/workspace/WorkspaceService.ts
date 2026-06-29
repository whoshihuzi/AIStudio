// ============================================================
// WorkspaceService — proxy to WorkspaceProvider.
// Owns the root + resolver singletons, injects them into
// WorkspaceProvider. Future: injects into SearchProvider too.
// ============================================================

import { WorkspaceRootProvider } from "./WorkspaceRootProvider.js";
import { PathResolver } from "./PathResolver.js";
import { WorkspaceProvider } from "./WorkspaceProvider.js";
import type { IWorkspaceProvider, FileContent, FileStat, DirectoryEntry, SearchResult, GlobResult } from "./types.js";

const rootProvider = new WorkspaceRootProvider();
const pathResolver = new PathResolver(rootProvider);

export class WorkspaceService implements IWorkspaceProvider {
  private readonly provider = new WorkspaceProvider(rootProvider, pathResolver);

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

/** Shared singletons — inject these into future providers. */
export { rootProvider, pathResolver };

export const workspaceService = new WorkspaceService();
