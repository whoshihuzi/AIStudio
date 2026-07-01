// ============================================================
// WorkspaceService — proxy to WorkspaceProvider.
// Owns root + resolver singletons. Exposes both internal
// and shared Resource Model methods.
// ============================================================

import { WorkspaceRootProvider } from "./WorkspaceRootProvider.js";
import { PathResolver } from "./PathResolver.js";
import { WorkspaceProvider } from "./WorkspaceProvider.js";
import { WriteAuditTrail } from "./WriteAuditTrail.js";
import type { IWriteAuditTrail } from "./WriteAuditTrail.js";
import type { IWorkspaceProvider, FileContent, FileStat, DirectoryEntry, SearchResult, GlobResult } from "./types.js";
import type { WorkspaceNode, FileNode } from "../../shared/workspace/types.js";

const rootProvider = new WorkspaceRootProvider();
const pathResolver = new PathResolver(rootProvider);

export class WorkspaceService implements IWorkspaceProvider {
  private readonly auditTrail = new WriteAuditTrail(1000);
  private readonly provider = new WorkspaceProvider(rootProvider, pathResolver, this.auditTrail);

  // Audit trail access
  getAuditTrail(): IWriteAuditTrail { return this.auditTrail; }

  // Internal (Provider types — for internal use)
  readFile(path: string): FileContent { return this.provider.readFile(path); }
  writeFile(path: string, content: string): void { this.provider.writeFile(path, content); }
  exists(path: string): boolean { return this.provider.exists(path); }
  stat(path: string): FileStat { return this.provider.stat(path); }
  listDirectory(path: string): DirectoryEntry[] { return this.provider.listDirectory(path); }
  glob(pattern: string): GlobResult { return this.provider.glob(pattern); }
  searchText(query: string, opts?: Parameters<IWorkspaceProvider["searchText"]>[1]): SearchResult {
    return this.provider.searchText(query, opts);
  }

  // Shared Resource Model (for IPC → Renderer consumption)
  listNodes(path: string): WorkspaceNode[] { return this.provider.listNodes(path); }
  statNode(path: string): FileNode { return this.provider.statNode(path); }
  readFileNode(path: string): { node: FileNode; content: string } { return this.provider.readFileNode(path); }

  // File operations
  rename(from: string, to: string): void { this.provider.rename(from, to); }
  mkdir(path: string): void { this.provider.mkdir(path); }
  delete(path: string): void { this.provider.delete(path); }
  copy(from: string, to: string): void { this.provider.copy(from, to); }
  move(from: string, to: string): void { this.provider.move(from, to); }
}

export { rootProvider, pathResolver };
export const workspaceService = new WorkspaceService();
