# Command Migration Plan

**Date**: 2026-06-30  
**Purpose**: Catalog every existing UI action (button, menu, keyboard shortcut) that should eventually become a Command.  
**Status**: Planning only. No code changes. Mapped to M11f (Wire existing actions as Commands).  
**Companion**: [`docs/command-system-review.md`](./command-system-review.md)

---

## Migration Table

Each row maps one existing action to its future Command. Implementation is planned for M11f — this document is the authoritative inventory.

| # | Source File | UI Element | Current Trigger | Command ID | Category | Shortcut (Proposed) | Priority | Notes |
|---|---|---|---|---|---|---|---|---|
| **Dashboard Actions** |
| 1 | `Dashboard.tsx:24` | Dashboard mount | `useEffect → refresh()` | `dashboard.refresh` | dashboard | F5 | P0 | Auto-refresh on mount; manual refresh via button/command |
| 2 | `DashboardHeader.tsx:50` | Refresh button (↻) | `onClick → refresh()` | `dashboard.refresh` | dashboard | F5 | P0 | Same as #1 — deduplicate at Command level |
| 3 | `DashboardHeader.tsx:50` | Language label click | N/A (display only) | `settings.set-language` | settings | Ctrl+Shift+L | P1 | Current: native menu only. Add click target. |
| 4 | `IsHealthy.tsx:27` | "Rerun checks" button | `onClick → refreshBuild()` | `dashboard.run-checks` | dashboard | Ctrl+Shift+B | P0 | |
| 5 | `IsHealthy.tsx:31` | "Run now" button | `onClick → refreshBuild()` | `dashboard.run-checks` | dashboard | Ctrl+Shift+B | P0 | Same command as #4 |
| 6 | `Dashboard.tsx:41` | "Retry" button (error state) | `onClick → refresh()` | `dashboard.refresh` | dashboard | F5 | P1 | Error recovery — same as #1 |
| **Navigation Actions** |
| 7 | `Sidebar.tsx:35` | "Dashboard" nav button | `onClick → onNavigate("dashboard")` | `navigation.open-dashboard` | navigation | Ctrl+Shift+D | P0 | |
| 8 | `Sidebar.tsx:74` | Session list item click | `onClick → switchSession(id) + onNavigate("chat")` | `session.open` | session | — | P0 | Parameter: session ID |
| 9 | `Sidebar.tsx:53` | "New Chat" button (+) | `onClick → createSession()` | `session.create` | session | Ctrl+N | P0 | |
| 10 | `Sidebar.tsx:86` | Session delete button (×) | `onClick → deleteSession(id)` | `session.delete` | session | — | P1 | Confirmation dialog before execute |
| **Workspace Explorer Actions** |
| 11 | `WorkspaceExplorer.tsx:29` | Refresh button (↻) | `onClick → refresh()` | `workspace.refresh-tree` | workspace | — | P1 | Re-reads directory listing |
| 12 | `WorkspaceTreeNode.tsx` | File double-click / Enter | `onDoubleClick → open(path)` | `workspace.open-file` | workspace | — | P0 | Opens file in PreviewPanel |
| 13 | `WorkspaceTreeNode.tsx` | Directory toggle | `onClick → toggle expand` | `workspace.toggle-directory` | workspace | — | P2 | Internal tree state — low priority for Command |
| **Preview Panel Actions** |
| 14 | `PreviewPanel.tsx:42` | Close button (✕) | `onClick → close()` | `workspace.close-preview` | workspace | Escape | P0 | |
| 15 | `PreviewPanel.tsx:38` | Refresh button (↻) | `onClick → refresh()` | `workspace.refresh-preview` | workspace | F5 (contextual) | P1 | Re-reads current preview file |
| **Session Actions** |
| 16 | `ChatView.tsx` | Send message | `ChatInput.onSend(prompt)` | `agent.send` | ai | Enter | P0 | Already via IPC; formalise as Command |
| 17 | `StatusBar.tsx` | Abort button | N/A (aborts running agent) | `agent.abort` | ai | Escape (when running) | P0 | Already via IPC; formalise as Command |
| 18 | `Sidebar.tsx:18` | Session init on mount | `useEffect → init()` | `session.list` | session | — | P1 | Internal: auto-loaded. Command for manual refresh. |
| **Native Menu Actions** |
| 19 | `main/index.ts:58-63` | Settings > Language > English | `click → setLanguage("en")` | `settings.set-language` | settings | — | P0 | Menu item → Command trigger |
| 20 | `main/index.ts:64-69` | Settings > Language > 简体中文 | `click → setLanguage("zh-CN")` | `settings.set-language` | settings | — | P0 | Same command, different payload |
| 21 | `main/index.ts:51` | AI Studio > Quit | `role: "quit"` | `app.quit` | settings | Alt+F4 / Ctrl+Q | P1 | System-level; formalise as Command for consistency |
| **Workspace File Operations** (M10.9 — right-click context menu) |
| 22 | Context menu | Rename file | Right-click → Rename | `workspace.rename` | workspace | F2 | P1 | |
| 23 | Context menu | Delete file | Right-click → Delete | `workspace.delete` | workspace | Delete | P1 | With confirmation |
| 24 | Context menu | New file | Right-click → New File | `workspace.create-file` | workspace | Ctrl+Shift+N | P1 | |
| 25 | Context menu | New folder | Right-click → New Folder | `workspace.create-directory` | workspace | Ctrl+Shift+M | P2 | |
| 26 | Context menu | Copy | Right-click → Copy | `workspace.copy` | workspace | Ctrl+C | P2 | |
| 27 | Context menu | Cut / Move | Right-click → Cut | `workspace.move` | workspace | Ctrl+X | P2 | |
| 28 | Context menu | Paste | Right-click → Paste | `workspace.paste` | workspace | Ctrl+V | P2 | |
| **Project Brain Actions** |
| 29 | `ProjectBrain.tsx` | Brain display (read-only) | N/A | `brain.refresh` | dashboard | — | P2 | Auto-loaded; Command for manual refresh after editing brain files |
| **Index / Search Actions** |
| 30 | N/A | Rebuild workspace index | No UI trigger yet | `workspace.rebuild-index` | workspace | — | P2 | IPC channel exists (`workspace:index:rebuild`), not wired to UI |
| 31 | N/A | Quick file search | No UI trigger yet | `workspace.quick-open` | workspace | Ctrl+P | P0 | Command Palette MVP |
| 32 | N/A | Command Palette (All) | No UI trigger yet | `commands.show-all` | navigation | Ctrl+Shift+P | P0 | Command Palette MVP |
| **Future / Implied Actions** (no current UI, planned for later milestones) |
| 33 | N/A | Switch agent/adapter | Future UI | `runtime.switch-adapter` | runtime | — | P3 | Phase 3 Multi-Agent |
| 34 | N/A | Open settings panel | Future UI | `settings.open` | settings | Ctrl+, | P3 | |
| 35 | N/A | Toggle theme | Future UI | `settings.toggle-theme` | settings | Ctrl+Shift+T | P3 | |
| 36 | N/A | Export session | Future UI | `session.export` | session | — | P3 | |
| 37 | N/A | Import session | Future UI | `session.import` | session | — | P3 | |

---

## Migration Phasing

### M11f (immediate next — "Wire existing actions as Commands")

Commands marked **P0** — the MVP set:

| Command ID | Existing Trigger |
|---|---|
| `dashboard.refresh` | DashboardHeader refresh button |
| `dashboard.run-checks` | IsHealthy "Run now" / "Rerun checks" |
| `navigation.open-dashboard` | Sidebar "Dashboard" button |
| `session.open` | Sidebar session list item |
| `session.create` | Sidebar "New Chat" button |
| `workspace.open-file` | WorkspaceTreeNode double-click |
| `workspace.close-preview` | PreviewPanel close button |
| `agent.send` | ChatInput onSend |
| `agent.abort` | StatusBar abort |
| `settings.set-language` | Native menu language items |
| `workspace.quick-open` | Ctrl+P (Command Palette) |
| `commands.show-all` | Ctrl+Shift+P (Command Palette) |

### M11f+1 (follow-up)

Commands marked **P1**:

| Command ID |
|---|
| `dashboard.refresh` (error retry) |
| `settings.set-language` (DashboardHeader click) |
| `session.delete` |
| `workspace.refresh-tree` |
| `workspace.refresh-preview` |
| `session.list` |
| `app.quit` |
| `workspace.rename` |
| `workspace.delete` |
| `workspace.create-file` |

### Later milestones

Commands marked **P2–P3** — implement when their feature areas are built.

---

## Migration Rules

1. **No dual paths**: Once an action is wired as a Command, remove the direct store/IPC call path. The Command is the single source of truth for that action.
2. **Backward compatible**: Commands can be introduced incrementally. An action can remain on its existing path until its Command is wired and verified.
3. **No Renderer knowledge in Executor**: Executors in Main process never import from Renderer. They communicate results via IPC push or invoke response.
4. **No Main knowledge in Renderer commands**: Commands that execute purely in Renderer (`navigation.open-dashboard`) get a Renderer-side executor. The Registry doesn't care where execution happens.
5. **Shortcuts are non-exclusive**: A shortcut can be registered even if the corresponding Command is not yet wired — the shortcut binding is part of the Command definition, independent of UI migration.

---

## Verification Checklist (M11f)

- [ ] All P0 commands registered in Registry
- [ ] All P0 UI triggers replaced with `registry.execute()`
- [ ] Ctrl+P opens Command Palette with workspace commands
- [ ] Ctrl+Shift+P opens Command Palette with all commands
- [ ] Existing behavior unchanged (no regression)
- [ ] Old direct call paths removed (no dual paths)
- [ ] Agent `send`/`abort` use Command path
