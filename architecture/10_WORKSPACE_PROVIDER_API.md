# 10 — WorkspaceProvider API & IPC

**Interface definitions. Implemented in v0.3.0 (M9-M10).**
**Last synced: 2026-07-01 — matches `src/main/workspace/WorkspaceProvider.ts` + `src/preload/index.ts`**

---

## WorkspaceProvider Interface

```typescript
// src/main/workspace/types.ts

// ----------------------------------------------------------
// Core types
// ----------------------------------------------------------

export interface FileStat {
  path: string;            // relative to workspace root
  absolutePath: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;            // bytes
  modifiedAt: number;      // unix timestamp
  createdAt: number;
}

export interface DirectoryEntry {
  name: string;
  path: string;            // relative
  isDirectory: boolean;
  isFile: boolean;
}

export interface FileContent {
  path: string;
  content: string;         // utf-8 text
  stat: FileStat;
  language?: string;       // inferred from extension
}

export interface SearchMatch {
  file: string;
  line: number;
  column: number;
  content: string;         // matching line
  context: string;         // surrounding lines
}

export interface SearchResult {
  query: string;
  matches: SearchMatch[];
  totalFiles: number;
  totalMatches: number;
}

export interface GlobResult {
  pattern: string;
  matches: string[];       // relative paths
}

// ----------------------------------------------------------
// WorkspaceProvider interface
// ----------------------------------------------------------

export interface IWorkspaceProvider {
  // File operations
  readFile(path: string): FileContent;
  writeFile(path: string, content: string): void;
  exists(path: string): boolean;
  stat(path: string): FileStat;
  listDirectory(path: string): DirectoryEntry[];
  rename(from: string, to: string): void;
  mkdir(path: string): void;
  delete(path: string): void;
  copy(from: string, to: string): void;
  move(from: string, to: string): void;

  // Shared Resource Model methods (for IPC → Renderer)
  listNodes(path: string): WorkspaceNode[];
  statNode(path: string): FileNode;
  readFileNode(path: string): { node: FileNode; content: string };

  // Query operations (stubs — not yet implemented)
  glob(pattern: string): GlobResult;             // throws "not implemented"
  searchText(query: string, options?: SearchOptions): SearchResult; // throws "not implemented"
}

export interface SearchOptions {
  maxResults?: number;     // default: 100
  includePattern?: string; // e.g. "*.ts"
  excludePattern?: string; // e.g. "node_modules"
  caseSensitive?: boolean;
}
```

---

## IPC Channels (actual — `src/preload/index.ts`)

```
┌─────────────────────────────────────────────────────────────┐
│ Channel              Direction     Input         Output     │
├─────────────────────────────────────────────────────────────┤
│ workspace:read       R→M          path:string    FileContent│
│ workspace:write      R→M          path,content   void      │
│ workspace:list       R→M          path:string    Entry[]   │
│ workspace:stat       R→M          path:string    FileStat  │
│ workspace:exists     R→M          path:string    boolean   │
│ workspace:rename     R→M          from,to:string void      │
│ workspace:mkdir      R→M          path:string    void      │
│ workspace:delete     R→M          path:string    void      │
│ workspace:copy       R→M          from,to:string void      │
│ workspace:move       R→M          from,to:string void      │
└─────────────────────────────────────────────────────────────┘
```

**Not yet exposed** (throws "not implemented"):
- `workspace:search` — `WorkspaceProvider.searchText()` is a stub (deferred to v0.4+)
- `workspace:glob` — `WorkspaceProvider.glob()` is a stub (deferred to v0.4+)

**Differences from original design:**
- `createFile` / `createDir` → replaced by single `mkdir` (handles dirs; file creation via `write` to non-existent path)
- `copy` / `move` added beyond original spec

### IPC Type Definitions (example — actual handlers in `src/main/index.ts`)

```typescript
// Main process — command:execute dispatches to handlers
// No direct ipcMain.handle("workspace:read") —
// operations go through command:execute → WorkspaceHandler → WorkspaceService → WorkspaceProvider
```

### Preload Bridge (actual — `src/preload/index.ts`)

```typescript
workspace: {
  list: (path: string) => ipcRenderer.invoke("workspace:list", path),
  stat: (path: string) => ipcRenderer.invoke("workspace:stat", path),
  read: (path: string) => ipcRenderer.invoke("workspace:read", path),
  exists: (path: string) => ipcRenderer.invoke("workspace:exists", path),
  write: (path, content) => ipcRenderer.invoke("workspace:write", path, content),
  rename: (from, to) => ipcRenderer.invoke("workspace:rename", from, to),
  mkdir: (path) => ipcRenderer.invoke("workspace:mkdir", path),
  delete: (path) => ipcRenderer.invoke("workspace:delete", path),
  copy: (from, to) => ipcRenderer.invoke("workspace:copy", from, to),
  move: (from, to) => ipcRenderer.invoke("workspace:move", from, to),
}
```

---

## Security Constraints

1. **Path validation**: All paths are relative to workspace root. WorkspaceProvider appends `process.cwd()` internally. The Renderer never sends absolute paths.

2. **No path traversal**: `workspace:read("../../../etc/passwd")` must be rejected. WorkspaceProvider resolves the path and verifies it stays within `process.cwd()`.

3. **No binary files**: `workspace:read` returns only text content. Binary files return `{ content: "[binary]", stat, language: null }`.

4. **Write audit**: `workspace:write` (and `mkdir`, `delete`, `copy`) records changes to an in-memory `WriteAuditTrail` (circular buffer, 1000 entries). Exposed via `WorkspaceService.getAuditTrail()` for future undo support. Audit entries record path, operation type (create/update/delete), and byte count. (Originally planned as filesystem log to `workspace/.history/`; re-implemented as in-memory buffer in M12.)

---

## Agent Access Path

Agents NEVER call `workspace:*` IPC directly. The flow is:

```
Agent prompt: "Read src/main/index.ts"
  │
  ▼
HermesAdapter (unchanged)
  │  spawn("hermes", ["chat", ..., prompt])
  │
  ▼
Hermes CLI executes tool calls internally
  │  Hermes has its own file access (--cli mode)
  │
  (Future: Agent receives workspace context through ContextBuilder)
```

**Key insight**: Current Hermes `--cli` mode has its own file system access. Context Injection provides awareness; the Agent's own tools provide action. WorkspaceProvider is the AIStudio-side gatekeeper that provides structured data to ContextBuilder and Dashboard, but does not replace the Agent's own tool execution.
