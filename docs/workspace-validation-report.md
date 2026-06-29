# M9b — Workspace Root & Path Resolution Validation

**Date**: 2026-06-28

---

## Capability Checks

### ✓ Workspace Root has a single source of truth

- `WorkspaceRootProvider` is the only class that knows the root path
- `process.cwd()` is called exactly once — in the constructor
- All other modules access the root via `rootProvider.getRoot()` or `pathResolver`

### ✓ All paths go through PathResolver

- `resolveWorkspacePath()` — general workspace paths
- `resolveDocsPath()` — docs/ directory
- `resolveBrainPath()` — workspace/brain/ directory
- `resolveSessionsPath()` — workspace/sessions/ directory
- `resolveRelative()` — child paths relative to a resolved parent

No module calls `path.join()` or `path.resolve()` directly.

### ✓ Path traversal is blocked

- `WorkspaceRootProvider.guard()` verifies every resolved absolute path stays within root
- Normalized path comparison (forward slashes) prevents Windows/Linux discrepancies
- Throws with descriptive error message on violation

### ✓ Renderer cannot bypass IPC

- Renderer has `contextIsolation: true`, `nodeIntegration: false`
- `window.api.workspace.*` is the only filesystem access path
- All paths sent from Renderer are treated as relative, resolved by PathResolver

### ✓ Provider does not resolve paths itself

- `WorkspaceProvider` takes `WorkspaceRootProvider` + `PathResolver` via constructor
- `safeResolve()` method removed — replaced with `this.paths.resolveWorkspacePath()`
- `ROOT` constant removed — replaced with `this.root.getRoot()`
- `toStat()` now receives the already-resolved `absPath` as parameter

---

## Current Limitations (documented, not bugs)

| Feature | Status | Reason |
|---|---|---|
| `glob()` | Stub | M11 Search & Index |
| `searchText()` | Stub | M11 Search & Index |
| `writeFile()` | Stub | M12 Code Manipulation |
| Symbolic link detection | Not implemented | Node.js `fs.realpathSync` available when needed |

---

## Future Provider Migration Path

```
WorkspaceRootProvider  ←  singleton (created once in WorkspaceService)
       │
PathResolver           ←  singleton (injected into all providers)
       │
       ├── WorkspaceProvider   ✓  refactored in M9b
       ├── BrainProvider       ○  TODO: migrate from process.cwd() + join()
       ├── GitProvider         ○  TODO: migrate from process.cwd()
       ├── TodoProvider        ○  TODO: migrate from join(process.cwd(), "docs")
       ├── SessionProvider     ○  TODO: migrate from join(process.cwd(), "workspace/sessions")
       └── [future] SearchProvider
```

### Migration notes (not blocking M9b)

- `BrainProvider`: uses `join(process.cwd(), "workspace", "brain")` — should use `pathResolver.resolveBrainPath()`
- `GitProvider`: uses `cwd: process.cwd()` in `execSync` — should use `rootProvider.getRoot()`
- `TodoProvider`: uses `join(process.cwd(), "docs", "09_TODO.md")` — should use `pathResolver.resolveDocsPath("09_TODO.md")`
- `SessionProvider`: uses `join(process.cwd(), "workspace", "sessions")` — should use `pathResolver.resolveSessionsPath()`

All four are deferred to a future cleanup milestone. No behavior changes in this milestone.
