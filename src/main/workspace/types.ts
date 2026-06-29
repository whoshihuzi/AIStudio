// ============================================================
// Workspace types — internal Provider types + frozen interface.
// ============================================================

import type { FileNode, DirectoryNode, WorkspaceNode } from "../../shared/workspace/types.js";

// ----------------------------------------------------------
// Internal types (Provider only, never exposed to Renderer)
// ----------------------------------------------------------

export interface FileStat {
  path: string;
  absolutePath: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modifiedAt: number;
  createdAt: number;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface FileContent {
  path: string;
  content: string;
  stat: FileStat;
  language?: string;
}

export interface SearchMatch {
  file: string;
  line: number;
  column: number;
  content: string;
  context: string;
}

export interface SearchResult {
  query: string;
  matches: SearchMatch[];
  totalFiles: number;
  totalMatches: number;
}

export interface GlobResult {
  pattern: string;
  matches: string[];
}

export interface SearchOptions {
  maxResults?: number;
  includePattern?: string;
  excludePattern?: string;
  caseSensitive?: boolean;
}

// ----------------------------------------------------------
// IWorkspaceProvider — frozen interface
// ----------------------------------------------------------

export interface IWorkspaceProvider {
  /** Read file content (internal). Use readFileNode for shared model. */
  readFile(path: string): FileContent;
  writeFile(path: string, content: string): void;
  exists(path: string): boolean;
  /** Internal stat. Use statNode for shared model. */
  stat(path: string): FileStat;
  /** Internal list. Use listNodes for shared model. */
  listDirectory(path: string): DirectoryEntry[];
  glob(pattern: string): GlobResult;
  searchText(query: string, options?: SearchOptions): SearchResult;

  // ----------------------------------------------------------
  // Shared Resource Model methods
  // ----------------------------------------------------------

  /** List directory as shared WorkspaceNode[]. */
  listNodes(path: string): WorkspaceNode[];
  /** Stat as shared FileNode. */
  statNode(path: string): FileNode;
  /** Read file as shared FileNode with content. */
  readFileNode(path: string): { node: FileNode; content: string };
}
