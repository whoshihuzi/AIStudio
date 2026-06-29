// ============================================================
// Workspace types — v0.3 Architecture Freeze (M9a skeleton).
// ============================================================

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
  readFile(path: string): FileContent;
  writeFile(path: string, content: string): void;
  exists(path: string): boolean;
  stat(path: string): FileStat;
  listDirectory(path: string): DirectoryEntry[];
  glob(pattern: string): GlobResult;
  searchText(query: string, options?: SearchOptions): SearchResult;
}
