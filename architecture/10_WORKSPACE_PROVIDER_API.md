# 10 — WorkspaceProvider API & IPC

**Interface definitions only. No implementation.**

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
  createFile(path: string): FileContent;
  createDirectory(path: string): void;
  delete(path: string): void;
  rename(from: string, to: string): void;

  // Query operations
  exists(path: string): boolean;
  stat(path: string): FileStat;
  listDirectory(path: string): DirectoryEntry[];
  glob(pattern: string): GlobResult;

  // Search operations (skeleton in M9, implementation in M11)
  searchText(query: string, options?: SearchOptions): SearchResult;
}

export interface SearchOptions {
  maxResults?: number;     // default: 100
  includePattern?: string; // e.g. "*.ts"
  excludePattern?: string; // e.g. "node_modules"
  caseSensitive?: boolean;
}
```

---

## IPC Channels

```
┌─────────────────────────────────────────────────────────────┐
│ Channel              Direction     Input         Output     │
├─────────────────────────────────────────────────────────────┤
│ workspace:read       R→M          path:string    FileContent│
│ workspace:write      R→M          path,content   void      │
│ workspace:list       R→M          path:string    Entry[]   │
│ workspace:stat       R→M          path:string    FileStat  │
│ workspace:glob       R→M          pattern:string GlobResult│
│ workspace:search     R→M          query,opts     SearchRes │
│ workspace:createFile R→M          path:string    FileContent│
│ workspace:createDir  R→M          path:string    void      │
│ workspace:delete     R→M          path:string    void      │
│ workspace:rename     R→M          from,to:string void      │
│ workspace:exists     R→M          path:string    boolean   │
└─────────────────────────────────────────────────────────────┘
```

### IPC Type Definitions

```typescript
// Main process handlers
ipcMain.handle("workspace:read", async (_e, path: string): Promise<FileContent> => {
  return workspaceProvider.readFile(path);
});

ipcMain.handle("workspace:list", async (_e, path: string): Promise<DirectoryEntry[]> => {
  return workspaceProvider.listDirectory(path);
});

ipcMain.handle("workspace:stat", async (_e, path: string): Promise<FileStat> => {
  return workspaceProvider.stat(path);
});

ipcMain.handle("workspace:search", async (_e, query: string, opts?: SearchOptions): Promise<SearchResult> => {
  return workspaceProvider.searchText(query, opts);
});

// ... etc for write, glob, createFile, createDir, delete, rename, exists
```

### Preload Bridge

```typescript
// src/preload/index.ts (additions)
workspace: {
  read: (path: string): Promise<FileContent> =>
    ipcRenderer.invoke("workspace:read", path),
  list: (path: string): Promise<DirectoryEntry[]> =>
    ipcRenderer.invoke("workspace:list", path),
  search: (query: string, opts?: SearchOptions): Promise<SearchResult> =>
    ipcRenderer.invoke("workspace:search", query, opts),
  // ...
}
```

---

## Security Constraints

1. **Path validation**: All paths are relative to workspace root. WorkspaceProvider appends `process.cwd()` internally. The Renderer never sends absolute paths.

2. **No path traversal**: `workspace:read("../../../etc/passwd")` must be rejected. WorkspaceProvider resolves the path and verifies it stays within `process.cwd()`.

3. **No binary files**: `workspace:read` returns only text content. Binary files return `{ content: "[binary]", stat, language: null }`.

4. **Write audit**: `workspace:write` logs the change to `workspace/.history/` for undo support (future M12).

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
