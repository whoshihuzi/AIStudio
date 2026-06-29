// ============================================================
// Workspace Resource Model — shared between Main and Renderer.
// No Electron imports. No Node.js imports. Pure data types.
// ============================================================

// ----------------------------------------------------------
// WorkspaceNode — base for all workspace entries
// ----------------------------------------------------------

export interface WorkspaceNode {
  /** Stable path-based identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Path relative to workspace root. */
  path: string;
  /** Node kind. */
  type: "file" | "directory";
}

// ----------------------------------------------------------
// FileNode — a file in the workspace
// ----------------------------------------------------------

export interface FileNode extends WorkspaceNode {
  type: "file";
  /** Inferred language from extension. */
  language?: string;
  /** Size in bytes. */
  size: number;
  /** Last modified timestamp (ms since epoch). */
  modifiedAt: number;
}

// ----------------------------------------------------------
// DirectoryNode — a directory in the workspace
// ----------------------------------------------------------

export interface DirectoryNode extends WorkspaceNode {
  type: "directory";
  /** Child nodes. Populated on demand, undefined when not loaded. */
  children?: WorkspaceNode[];
}

// ----------------------------------------------------------
// WorkspaceSelection — user selection state (UI-only)
// ----------------------------------------------------------

export interface WorkspaceSelection {
  nodes: WorkspaceNode[];
  anchor?: WorkspaceNode;
}

// ----------------------------------------------------------
// WorkspaceChange — a detected file change (for diff/patch)
// ----------------------------------------------------------

export interface WorkspaceChange {
  path: string;
  type: "created" | "modified" | "deleted" | "renamed";
  oldPath?: string;
  timestamp: number;
}

// ----------------------------------------------------------
// WorkspaceMetadata — aggregate workspace statistics
// ----------------------------------------------------------

export interface WorkspaceMetadata {
  root: string;
  totalFiles: number;
  totalDirectories: number;
  languageBreakdown: Record<string, number>;
}

// ----------------------------------------------------------
// TreeState — UI expand/collapse state (Renderer only)
// ----------------------------------------------------------

export interface TreeState {
  expandedPaths: string[];
  scrollPosition: number;
}
