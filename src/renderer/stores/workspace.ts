// ============================================================
// WorkspaceStore — state for the file tree.
// Never touches filesystem, never resolves paths.
// Only consumes shared Resource Model types via IPC.
// ============================================================

import { create } from "zustand";

export interface WorkspaceState {
  /** Root nodes of the workspace (top-level entries). */
  nodes: WorkspaceNode[];
  /** Set of expanded directory paths. */
  expanded: Set<string>;
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  toggleDirectory: (path: string) => void;
}

/** Directories to hide from the tree. */
const HIDDEN = new Set([
  "node_modules", ".git", "dist", "out", "coverage", "debug",
  ".vscode", ".idea", "__pycache__",
]);

/** Sort: directories first, then alphabetical. */
function sortNodes(nodes: WorkspaceNode[]): WorkspaceNode[] {
  return [...nodes]
    .filter((n) => !HIDDEN.has(n.name))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  nodes: [],
  expanded: new Set<string>(),
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const raw = await window.api.workspace.list("");
      const nodes: WorkspaceNode[] = Array.isArray(raw) ? raw as WorkspaceNode[] : [];
      set({ nodes: sortNodes(nodes), loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  toggleDirectory: (path: string) => {
    const expanded = new Set(get().expanded);
    if (expanded.has(path)) {
      expanded.delete(path);
    } else {
      expanded.add(path);
    }
    set({ expanded });
  },
}));
