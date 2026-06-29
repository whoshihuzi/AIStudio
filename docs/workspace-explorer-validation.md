# M10a — Workspace Explorer Validation

**Date**: 2026-06-28

---

## Architecture Checks

| Check | Status |
|---|---|
| Explorer imports only shared types (WorkspaceNode) | ✓ |
| Explorer never imports WorkspaceProvider | ✓ |
| WorkspaceStore uses only `window.api.workspace.*` IPC | ✓ |
| No path resolution in Renderer | ✓ |
| No fs/Node.js imports in Renderer | ✓ |
| WorkspaceMapper is the only conversion point | ✓ |

---

## Tree Behavior

| Check | Status |
|---|---|
| Directories show ▶/▼ toggle | ✓ |
| Files show no toggle indicator | ✓ |
| Click directory → expands, loads children | ✓ |
| Click directory again → collapses | ✓ |
| Indentation: +16px per level | ✓ |
| Sort: directories first, then alphabetical | ✓ |

---

## Hidden Directories

| Directory | Hidden? |
|---|---|
| node_modules | ✓ |
| .git | ✓ |
| dist | ✓ |
| out | ✓ |
| coverage | ✓ |
| debug | ✓ |
| .vscode | ✓ |
| .idea | ✓ |
| __pycache__ | ✓ |

---

## States

| State | Implementation |
|---|---|
| Loading | Skeleton pulse animation (3 gray bars) |
| Empty | "This workspace is empty." |
| Error | Yellow error text + Retry button |
| Normal | File tree with collapsible directories |

---

## Sidebar Layout

```
Dashboard
──────────────
Workspace  ↻
  src
    main
    renderer
    shared
  docs
  package.json
──────────────
Sessions  +
  Chat A
  Chat B
```

---

## Build

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — all entries pass
- [ ] `npm start` — Explorer renders in Sidebar
