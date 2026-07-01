# Editor Architecture Review

**Existing Module Compatibility with the Frozen Editor Architecture**

Status: Architecture Freeze — M12a
Date: 2026-06-30
Reference: `architecture/15_EDITOR_ARCHITECTURE.md`

---

## Modules — Compatibility Assessment

### 1. WorkspaceProvider

**Current location**: `src/main/workspace/WorkspaceProvider.ts`
**Current state**: Implements `IWorkspaceProvider` — `readFile`, `writeFile`, `writeFile` (already has write!), `exists`, `stat`, `listDirectory`, `rename`, `mkdir`, `delete`, `copy`, `move`, `listNodes`, `statNode`, `readFileNode`.

**Editor impact**: Zero changes required.

**Why**: WorkspaceProvider already exposes `writeFile(relPath, content)` — the exact method the Editor save path needs. The `writeFile` was introduced in M10.9 (Workspace operations) and routes through `PathResolver` for workspace-relative path resolution and security.

```
EditorHandler.save → WorkspaceService.writeFile → WorkspaceProvider.writeFile → fs.writeFileSync
```

The intermediate `WorkspaceService` proxy (singleton) already exists and delegates to `WorkspaceProvider`. No new method needed.

**Verdict**: ✓ No modification needed.

---

### 2. WorkspaceService

**Current location**: `src/main/workspace/WorkspaceService.ts`
**Current state**: Proxy singleton over `WorkspaceProvider`. Exposes both internal (Provider types) and Shared Resource Model methods. Already has `writeFile`, `readFileNode`, `statNode`, `stat`, `exists`.

**Editor impact**: Zero changes required.

**Why**: `WorkspaceService.writeFile(path, content)` is the call the EditorHandler will make. The method already exists. The singleton `workspaceService` is already exported and importable.

**Verdict**: ✓ No modification needed.

---

### 3. PathResolver

**Current location**: `src/main/workspace/PathResolver.ts`
**Current state**: Resolves workspace-relative paths to absolute paths. Validates paths stay within workspace root.

**Editor impact**: Zero changes required.

**Why**: The Editor save path will pass a workspace-relative path (e.g., `"src/main/index.ts"`). PathResolver already handles this. EditorHandler does not resolve paths itself — it passes the relative path to WorkspaceService, which delegates to WorkspaceProvider, which uses PathResolver internally. This is identical to how `workspace:write` IPC already works.

**Verdict**: ✓ No modification needed.

---

### 4. Workspace Explorer

**Current location**: `src/renderer/components/WorkspaceExplorer.tsx`
**Current state**: Read-only collapsible file tree. Single-click selects node, no double-click behavior currently.

**Editor impact**: Minor addition — double-click behavior.

**Why**: Editor "Open" lifecycle can be triggered from multiple surfaces:
1. **WorkspaceExplorer double-click** → `EditorStore.open(path)` → transitions from Preview to Editor
2. **Command Palette** → `editor.open` command
3. **AI agent** → `editor.open` tool call

WorkspaceExplorer already sets `selectedWorkspaceNode` on click (via `useWorkspaceStore`). Adding a double-click handler that calls `EditorStore.open(selectedNode.path)` is a UI-only addition — no architectural change to WorkspaceExplorer.

The file tree itself does not change. The distinction between "click to preview" and "double-click to edit" is a UX concern, not an architectural one.

**Verdict**: ✓ No structural change. Double-click handler is a UI addition in M12e.

---

### 5. PreviewPanel

**Current location**: `src/renderer/components/PreviewPanel.tsx`
**Current state**: Read-only file content viewer. Uses `useWorkspacePreviewStore` for state. Calls `command.execute("preview.close")` on close.

**Editor impact**: Zero changes required.

**Why**: Preview and Editor are siblings at App Root, sharing the panel slot. When Editor opens a file:
1. `EditorStore.open(path)` is called.
2. PreviewPanel automatically closes (its visibility is tied to `workspacePreviewStore.visible`, which is set to false when Editor opens).
3. EditorPanel renders in the same panel slot.

PreviewPanel code does not change. It continues to function as a read-only viewer. The architecture document explicitly states:

> Preview and Editor share the panel slot. At most one is visible at a time. Opening Editor closes Preview and vice versa.

This is enforced in App.tsx layout logic, not inside PreviewPanel.

**Verdict**: ✓ No modification needed. App.tsx manages panel slot visibility.

---

### 6. Command System (Registry + Executor)

**Current location**: `src/main/runtime/commands/CommandRegistry.ts`, `CommandExecutor.ts`
**Current state**: Implements `ICommandRegistry` (register/unregister/find/findByCategory/list/execute) and `ICommandExecutor` (execute dispatch). Handlers: WorkspaceHandler, DashboardHandler, SessionHandler, RuntimeHandler, SettingsHandler, PreviewHandler.

**Editor impact**: ± Addition — new `EditorHandler` + new command definitions.

**Why**: The Editor architecture requires these Commands:

| Command ID | Category | Phase | Handler |
|---|---|---|---|
| `editor.open` | workspace | M12d | EditorHandler |
| `editor.save` | workspace | M12d | EditorHandler |
| `editor.close` | workspace | M12e | EditorHandler |
| `editor.diff` | workspace | M13+ | EditorHandler |
| `editor.apply-patch` | workspace | M13+ | EditorHandler |
| `editor.edit` | ai | M13+ | EditorHandler |
| `editor.git-stage` | workspace | M14+ | EditorHandler |
| `editor.check-external-change` | workspace | M13+ | EditorHandler |

These follow the exact same pattern as existing handlers:
- Implement `CommandHandler` interface
- Constructor receives dependencies (WorkspaceService)
- `execute(context, commandId)` → `switch` → `CommandResult`
- Registered in `DefaultCommandRegistry` at app start

**Existing modules unchanged**: CommandRegistry, CommandExecutor, and all existing handlers (WorkspaceHandler, PreviewHandler, etc.) do not change. EditorHandler is a net-new addition.

**Verdict**: ✓ Existing command infrastructure fully supports Editor. Net-new EditorHandler + command definitions only.

---

### 7. WorkspaceStore

**Current location**: `src/renderer/stores/workspace.ts`
**Current state**: Zustand store for file tree state — `nodes`, `expanded`, `loading`, `error`, `refresh()`, `toggleDirectory()`.

**Editor impact**: Zero changes required.

**Why**: WorkspaceStore manages the file tree — what files exist and which directories are expanded. EditorStore manages the editing state — what file is open, what the buffer contains, whether it's dirty. These are separate stores with separate responsibilities.

WorkspaceStore already has `selectedWorkspaceNode` (via `useWorkspaceStore` consumer components). The Editor open flow references this node but does not modify WorkspaceStore.

**Verdict**: ✓ No modification needed. EditorStore is a separate new store.

---

### 8. WorkspacePreviewStore

**Current location**: `src/renderer/stores/workspace-preview.ts`
**Current state**: Zustand store for preview state — `file`, `visible`, `loading`, `error`, `open()`, `close()`, `refresh()`.

**Editor impact**: Zero changes required.

**Why**: WorkspacePreviewStore and EditorStore are separate stores. They manage different lifecycle states:

| | WorkspacePreviewStore | EditorStore |
|---|---|---|
| Purpose | Read-only viewing | Writable editing |
| State fields | file, visible, loading, error | activeFile, originalContent, currentContent, dirty, saving, cursor, selection, etc. |
| Write path | None (read-only) | command.execute("editor.save") |
| Close behavior | Just hides | May prompt to save unsaved changes |

The transition from Preview to Editor is a panel slot swap, not a store merge. When Editor opens, `WorkspacePreviewStore.visible` is set to false. When Editor closes, Preview may reopen for the same file (read-only view of saved content).

**Verdict**: ✓ No modification needed. Separate store, separate lifecycle.

---

### 9. RuntimeManager

**Current location**: `src/main/runtime/runtime-manager.ts`
**Current state**: `AgentRuntimeManager` — adapter registry, context injection, agent lifecycle, tool executor.

**Editor impact**: Zero changes required (v0.3).

**Why**: RuntimeManager manages AI agent process lifecycle. It does not manage files or editing state. The Editor architecture routes ALL writes through Commands → EditorHandler → WorkspaceService, not through RuntimeManager.

In future (M13+), when AI agents invoke `editor.edit` as a tool, the tool call will be dispatched as a Command — same as any other Command. RuntimeManager does not need to know about Editor. The tool registry (`WorkspaceToolRegistry`) can register Editor tools, but that's a tool registration concern, not a RuntimeManager change.

**Verdict**: ✓ No modification needed.

---

### 10. DashboardService

**Current location**: `src/main/dashboard/DashboardService.ts`
**Current state**: Single entry point for Dashboard data — project info, brain data, build checks, validation.

**Editor impact**: Zero changes required.

**Why**: Dashboard displays project state. Editor modifies files. These are orthogonal concerns. Dashboard may eventually show "currently editing: filename" as part of activity state, but that's Dashboard consuming Editor metadata, not Editor depending on Dashboard.

**Verdict**: ✓ No modification needed.

---

### 11. App.tsx (Layout)

**Current location**: `src/renderer/App.tsx`
**Current state**: Three-column layout: Sidebar | Main Content | PreviewPanel (conditional). View state: `dashboard` | `chat`.

**Editor impact**: Minor layout addition.

Current App.tsx structure:
```tsx
<Sidebar activeView={view} onNavigate={(v) => setView(v)} />
<div className="flex-1 flex flex-col">
  {view === "dashboard" ? <Dashboard /> : <ChatView />}
</div>
{previewVisible && <div className="w-96 shrink-0 flex flex-col"><PreviewPanel /></div>}
```

Editor requires:
```tsx
const panelMode = useEditorStore((s) => s.activeFile ? "editor" : "preview");

// Panel slot: EditorPanel or PreviewPanel, never both
const panel = panelMode === "editor"
  ? <div className="w-96 shrink-0 flex flex-col"><EditorPanel /></div>
  : previewVisible && <div className="w-96 shrink-0 flex flex-col"><PreviewPanel /></div>;
```

This is a layout composition change, not an architectural one. The `currentView` state may also expand from `"dashboard" | "chat"` to `"dashboard" | "chat" | "search" | "editor"` — which was already anticipated in the CommandContext type (`currentView: "dashboard" | "chat" | "search" | "editor"`).

**Verdict**: ✓ Minor addition — App.tsx grows a panel mode toggle. No structural redesign.

---

### 12. Preload Bridge (IPC)

**Current location**: `src/preload/index.ts`
**Current state**: Exposes `window.api.workspace.read`, `window.api.workspace.list`, `window.api.command.execute`, `window.api.agent.*`, `window.api.session.*`.

**Editor impact**: Zero changes required.

**Why**: The Editor architecture routes ALL writes through `command.execute("editor.save", ...)` — not through `window.api.workspace.write`. The `command:*` IPC channel already exists and supports sending commands from Renderer to Main.

No new IPC channel is necessary:
- `editor.open` → `command.execute("editor.open", { path })` (existing channel)
- `editor.save` → `command.execute("editor.save", { path, content })` (existing channel)
- `editor.close` → `command.execute("editor.close")` (existing channel)

The preload bridge does not change.

**Verdict**: ✓ No new IPC channels. No preload modifications.

---

### 13. Main Process IPC Handlers

**Current location**: `src/main/index.ts`
**Current state**: Registers IPC handlers for `command:execute`, `workspace:read`, `workspace:list`, `workspace:write`, agent lifecycle, session lifecycle.

**Editor impact**: Zero changes required.

**Why**: `command:execute` handler already dispatches to `CommandExecutor`. Adding `editor.*` commands to the registry means the existing `command:execute` handler will automatically route them to EditorHandler. No new IPC handler registration needed.

**Verdict**: ✓ No modification needed.

---

### 14. Shared Types

**Current location**: `src/shared/command/types.ts`, `src/shared/workspace/types.ts`
**Current state**: CommandContext, CommandDefinition, CommandResult, WorkspaceNode, FileNode, DirectoryNode, etc.

**Editor impact**: ± Addition — new shared type file.

**Why**: EditorState is a new shared resource model. It belongs in:
```
src/shared/editor/types.ts   (new file)
```

This follows the same pattern as `src/shared/workspace/types.ts`:
- Pure data types, zero dependencies
- Shared between Main (EditorHandler) and Renderer (EditorStore, EditorPanel)
- No Electron, Node, or React imports

Existing shared types (`CommandContext`, `WorkspaceNode`) are reused by Editor where applicable. `CommandContext` already has `currentView: "dashboard" | "chat" | "search" | "editor"` — the `"editor"` value was anticipated.

**Verdict**: ✓ New file: `src/shared/editor/types.ts`. Existing shared types unchanged.

---

## Summary — Modification Impact

| Module | Change Required? | What Changes |
|---|---|---|
| WorkspaceProvider | No | Uses existing `writeFile()` |
| WorkspaceService | No | Uses existing `writeFile()` |
| PathResolver | No | Uses existing path resolution |
| WorkspaceExplorer | No (UI addition) | Double-click handler (M12e) |
| PreviewPanel | No | No changes |
| Command Registry | No | New commands registered in DefaultCommandRegistry |
| Command Executor | No | Dispatches to new EditorHandler |
| WorkspaceHandler | No | No changes |
| PreviewHandler | No | No changes |
| DashboardHandler | No | No changes |
| WorkspaceStore | No | No changes |
| WorkspacePreviewStore | No | No changes |
| RuntimeManager | No | No changes |
| DashboardService | No | No changes |
| App.tsx | Minor | Panel slot: Preview or Editor |
| Preload (IPC) | No | No new channels |
| Main index.ts | No | No new handlers |
| Shared types | Addition | New file: `src/shared/editor/types.ts` |

---

## Net-New Modules (Future M12b-M12h)

These are new files that will be created during Editor implementation. None exist today.

| Module | Phase | Location |
|---|---|---|
| EditorState types | M12b | `src/shared/editor/types.ts` |
| EditorStore | M12c | `src/renderer/stores/editor.ts` |
| EditorHandler | M12d | `src/main/runtime/commands/handlers/EditorHandler.ts` |
| EditorPanel | M12e | `src/renderer/components/EditorPanel.tsx` |
| Editor commands config | M12d | `src/main/runtime/commands/DefaultCommandRegistry.ts` (additions) |
| DocumentHandler | M11e | `src/main/runtime/commands/handlers/DocumentHandler.ts` |
| documentBridge | M11e | `src/renderer/runtime/document-bridge.ts` |

### DocumentHandler + documentBridge (M11e — Architecture Freeze Prerequisites)

These modules are created BEFORE Editor implementation to establish clean ownership:

- **DocumentHandler** owns document lifecycle ONLY (ensure, activate, reveal, close).
  It must NEVER read file content. Content loading belongs to Preview/Editor/ContentProvider.
- **documentBridge** is a transport-only renderer module. It calls
  `window.api.command.execute()` and returns `CommandResult`. It must NEVER access
  DocumentStore, EditorStore, WorkspacePreviewStore, or any renderer state.
- **Ownership rule**: `Command → CommandResult → Renderer Store` (NOT `Command → Bridge → Multiple Stores`).

---

## Design Principle Audit

The frozen Editor architecture does not violate, weaken, or require modification of any existing Design Principle. For the full compliance matrix, see `architecture/15_EDITOR_ARCHITECTURE.md` Section 9.

---

## Risk: What Could Require Architecture Changes

| Scenario | Impact | Mitigation |
|---|---|---|
| Monaco Editor requires Node.js APIs in Renderer | Would violate Principle 11 | Use Monaco's web worker mode (no Node.js) or CodeMirror as fallback |
| Large file editing causes Renderer OOM | Performance | File size limits already in architecture (Section 8.1) |
| Multiple EditorPanels needed (split view) | EditorStore grows array of EditorState | Architecture already supports this (Future Compatibility Section 7) |
| Real-time collaboration (multiple users editing same file) | Major architecture change | Out of scope. Would require CRDT or OT, new IPC channels, conflict resolution protocol |

---

## Conclusion

**The frozen Editor architecture is a net-new capability that composes with existing modules without modifying them.**

- 12 of 13 existing modules require zero changes.
- 1 module (App.tsx) requires a minor layout addition.
- 1 shared types file is net-new.
- 5 new modules will be created during Editor implementation.
- Zero design principles are violated.

The Editor architecture is ready for implementation in M12b.
