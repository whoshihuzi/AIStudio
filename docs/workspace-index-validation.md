# M11a — Workspace Index Foundation Validation

**Date**: 2026-06-28

---

## Architecture

```
WorkspaceIndexStore
  └── WorkspaceIndexer
        └── WorkspaceProvider.listDirectory() + stat()
              ├── readdirSync + statSync
              └── PathResolver (security)

No direct fs access from indexer.
No content read. Metadata only.
```

---

## Index Data

| Field | Description |
|---|---|
| path | Relative workspace path |
| name | File/directory name |
| extension | Lowercase file extension (no dot) |
| size | Bytes (0 for directories) |
| mtime | Modified timestamp (ms) |
| isDirectory | true/false |

---

## Hidden Paths (excluded)

| Pattern | Source |
|---|---|
| `.` (dot-prefix) | `.git`, `.vscode`, `.env` |
| `node_modules` | exact match |
| `dist`, `out`, `coverage` | exact match |
| `__pycache__` | exact match |

---

## IPC

| Channel | Input | Output |
|---|---|---|
| `workspace:index:rebuild` | (none) | `IndexStats` |
| `workspace:index:stats` | (none) | `IndexStats \| null` |

---

## Store API

```
rebuild()      → IndexStats     (full rescan)
getAll()       → IndexEntry[]   (cached entries)
findByPath()   → IndexEntry?    (exact match)
findByName()   → IndexEntry[]   (case-insensitive substring)
getStats()     → IndexStats?    (last rebuild stats)
```

---

## Dependencies (none of these imports the index)

| Module | Index Dependency |
|---|---|
| RuntimeManager | ✗ |
| Dashboard | ✗ |
| Renderer | ✗ |
| HermesAdapter | ✗ |
| ContextBuilder | ✗ |

---

## Build

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — all entries pass
