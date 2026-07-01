# 15 — Editor Architecture

**Frozen Editor architecture for AI Studio. No implementation.**

---

## 1. Why Editor Must Be Independent from Preview

AI Studio currently has **Preview** — a read-only document viewer. The next phase requires **Editor** — a writable document editor. These must be separate abstractions.

| | Preview | Editor |
|---|---|---|
| **Purpose** | View document content | Modify document content |
| **Operations** | Read only | Read + Write |
| **State** | `{ file, loading, error }` | `{ activeFile, originalContent, currentContent, dirty, saving, ... }` |
| **Data flow** | WorkspaceProvider.readFile → IPC → Renderer | Renderer → Command → EditorHandler → WorkspaceService.writeFile → Disk |
| **Command category** | `preview.*` | `editor.*` |
| **Lifecycle** | Open file → display → close | Open → Load → Edit → Dirty → Save → Clean → Close |
| **Concurrency** | No write conflicts (read-only) | Must handle external changes, concurrent saves, crash recovery |
| **Future** | Stable, minimal additions | Extensible: undo/redo, diff, patch, AI edit, git stage |

**Key rule**: Preview and Editor can coexist at App Root. Preview shows what's on disk. Editor holds a mutable buffer that may or may not match disk. They are siblings, not replacements.

---

## 2. Overall Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        APP ROOT                               │
│                                                              │
│  ┌──────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │          │  │                    │  │                  │  │
│  │ Sidebar  │  │   Main Content     │  │  Preview /       │  │
│  │          │  │                    │  │  Editor Panel     │  │
│  │ Dashboard│  │  Dashboard         │  │                  │  │
│  │ Workspace│  │  or                │  │  PreviewPanel     │  │
│  │ Sessions │  │  Chat              │  │  or               │  │
│  │          │  │  or                │  │  EditorPanel      │  │
│  │          │  │  Search            │  │  (future)         │  │
│  │          │  │  or                │  │                  │  │
│  │          │  │  Editor (future)   │  │  Independent of   │  │
│  │          │  │                    │  │  Main view        │  │
│  └──────────┘  └────────────────────┘  └──────────────────┘  │
│                                                              │
│  Sidebar:    fixed w-56, never resizes                       │
│  Main:       flex-1, fills remaining space                   │
│  Panel:      w-96 default, resizable (future)                │
│              PreviewPanel or EditorPanel, never both          │
│              Visible independent of Main Content view         │
└──────────────────────────────────────────────────────────────┘
```

### Key Rules

1. **Preview and Editor are siblings at App Root.** Neither is a child of Dashboard, Chat, or any other Main Content view.
2. **Any Main Content view can coexist with an open Preview or Editor.** Dashboard + Preview open. Chat + Editor open. Search + Preview open.
3. **Preview and Editor share the panel slot.** At most one is visible at a time. Opening Editor closes Preview and vice versa.
4. **Main Content view switching never closes Preview or Editor.** Switching Dashboard → Chat preserves the open panel.
5. **Closing Preview/Editor never changes Main Content view.**

---

## 2.5 Document Lifecycle vs Content Loading (FROZEN)

### DocumentHandler — Lifecycle Only

The `DocumentHandler` (main process) owns Document **lifecycle** only:

| Operation | Responsibility | Content Access |
|---|---|---|
| `document.ensure` | Validate existence via WorkspaceService | NO |
| `document.activate` | Signal document is now active/focused | NO |
| `document.reveal` | Reveal in system file manager | NO |
| `document.close` | Signal document close | NO |

**Explicit prohibition**: DocumentHandler must NEVER read file content. It may call
`WorkspaceService.exists()` for validation, but it must never call `readFile`,
`readFileNode`, or any content-access method.

**Why this separation**: Lifecycle (does this file exist? is it open?) and content
loading (what does it contain?) are different concerns with different error modes,
caching strategies, and performance profiles. Mixing them creates a handler that
is neither a good lifecycle manager nor a good content provider.

**Content loading** belongs to the content-loading layer:
- `PreviewPanel` (via `WorkspacePreviewStore`) — read-only preview
- `EditorPanel` (via `EditorStore`) — writable editing
- Future `ContentProvider` — language-aware content loading (LSP, syntax tree, etc.)

These layers consume `DocumentHandler` lifecycle events but manage their own content
loading independently.

### documentBridge — Transport Only

The `documentBridge` (renderer) is a **transport pipe**, not a coordinator:

```
✓ CORRECT:
  Command → CommandResult → Renderer Store

✗ WRONG:
  Command → Bridge → Multiple Stores
```

**documentBridge may**:
- Call `window.api.command.execute(id, args)`
- Return `CommandResult` (typed)

**documentBridge must NEVER**:
- Import `DocumentStore`
- Import `EditorStore`
- Import `WorkspacePreviewStore`
- Call `useDocumentStore` / `useEditorStore` / `useWorkspacePreviewStore`
- Manipulate any renderer state
- Call `window.api.workspace.read` / `write` directly

**Why transport-only**: The bridge must not become a renderer-side coordinator
that spreads a single command's result across multiple stores. Each store
is responsible for consuming the `CommandResult` and updating its own state.
The bridge is a thin wrapper over the IPC — nothing more.

### Ownership Chain

```
UI Component / Store
    │
    │  documentBridge(id, args)         ← transport pipe, no state access
    │
    ▼
window.api.command.execute(id, args)    ← IPC bridge
    │
    ▼
CommandExecutor.execute(id, context)    ← dispatch
    │
    ▼
DocumentHandler.execute(ctx, id)        ← lifecycle logic only
    │
    ▼
WorkspaceService.exists(path)           ← infrastructure (existence only)
```

The `CommandResult` flows back up the same chain. Each renderer store reads
`result.payload` and updates its own state independently.

---

## 3. Editor Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      RENDERER PROCESS                         │
│                                                              │
│  EditorPanel (Presentation)                                  │
│       │                                                      │
│       ▼                                                      │
│  EditorStore (Application)                                   │
│       │                                                      │
│       │  command.execute("editor.save")                      │
│       │  command.execute("editor.open")                      │
│       │                                                      │
│       │  NEVER: window.api.workspace.write(path, content)    │
│       │  NEVER: import { writeFileSync } from anywhere       │
│       │                                                      │
├───────┼──── IPC ─────────────────────────────────────────────┤
│       │                                                      │
│       ▼                                                      │
│  Command Executor                                            │
│       │                                                      │
│       ▼                                                      │
│  EditorHandler (Infrastructure)                              │
│       │                                                      │
│       ▼                                                      │
│  WorkspaceService (Infrastructure)                           │
│       │                                                      │
│       ▼                                                      │
│  WorkspaceProvider (Infrastructure)                          │
│       │                                                      │
│       ▼                                                      │
│  Disk (fs.writeFileSync)                                     │
│                                                              │
│                    MAIN PROCESS                              │
└──────────────────────────────────────────────────────────────┘
```

**Invariant**: The Renderer process has zero direct file system access. Every write flows through:

```
Renderer → Command → EditorHandler → WorkspaceService → WorkspaceProvider → Disk
```

No shortcut. No exception. This is enforced by Principle 11 (Renderer No FS) and Principle 18 (Interaction through Commands).

---

## 4. EditorState (Frozen Interface)

```typescript
// src/shared/editor/types.ts — Editor Resource Model
// Shared between Main and Renderer. No Electron imports. No Node imports. Pure data types.

export interface EditorState {
  /** Currently open file path (relative to workspace root). null when no file is open. */
  activeFile: string | null;

  /** Content as it was on disk when last loaded or saved.
   *  Used to compute dirty flag and for diff generation. */
  originalContent: string | null;

  /** Current editor buffer content. May differ from originalContent (dirty) or disk. */
  currentContent: string | null;

  /** Whether currentContent differs from originalContent. */
  dirty: boolean;

  /** Whether a save operation is in flight. */
  saving: boolean;

  /** File encoding. Default: "utf-8". */
  encoding: string;

  /** Timestamp of last successful save (ms since epoch). null if never saved. */
  lastSaved: number | null;

  /** Primary cursor position: { line, column } (1-indexed). */
  cursor: EditorPosition | null;

  /** Current selection range. null when nothing is selected. */
  selection: EditorSelection | null;

  /** Inferred language from file extension (e.g. "typescript", "python", "markdown"). */
  language: string | null;

  /** Whether the file or view mode prohibits editing (e.g. binary, external lock). */
  readonly: boolean;
}

export interface EditorPosition {
  line: number;    // 1-indexed
  column: number;  // 1-indexed
}

export interface EditorSelection {
  start: EditorPosition;
  end: EditorPosition;
}
```

This interface is the **frozen contract** between EditorStore (Renderer), EditorHandler (Main), and all future Editor features. Adding a field requires an architecture review. Changing a field's meaning requires an ADR.

### State Combinations

| `activeFile` | `originalContent` | `dirty` | Meaning |
|---|---|---|---|
| null | null | false | No file open |
| path | null | false | File loaded, content unchanged |
| path | content | true | User has edited since last load/save |
| path | content | false | Content matches last load/save |

---

## 5. Lifecycle

### Open

```
User action: double-click file in WorkspaceExplorer, select from Command Palette ("editor.open"),
  or AI agent invokes "editor.open" tool

Entry: EditorStore.open(path: string)
  1. Set activeFile = path, saving = false, dirty = false
  2. Emit command "editor.open" → EditorHandler
  3. EditorHandler → WorkspaceService.readFileNode(path) → { node, content }
  4. Return content to EditorStore
  5. Set originalContent = content, currentContent = content
  → State: Load
```

### Load

```
EditorStore receives file content from "editor.open" handler
  1. Set activeFile = path
  2. Set originalContent = content
  3. Set currentContent = content
  4. Set dirty = false
  5. Set language = inferred from file extension
  6. Set encoding = "utf-8"
  7. Set readonly = false
  8. Set cursor = { line: 1, column: 1 }
  9. Reset selection = null
  → State: Clean, ready for Edit
```

### Edit

```
User types or AI modifies via EditorStore.edit(change)
  1. Update currentContent with change
  2. Recompute dirty = (currentContent !== originalContent)
  3. Update cursor position
  4. Fire "editor.changed" event for subscribers (Undo stack, dirty indicator)
  → State: Dirty (if content differs from original)
```

### Dirty

```
State where currentContent !== originalContent.
Visual indicator: dot or asterisk in tab/file header.

Triggers:
  - "editor.changed" event
  - Save button becomes enabled
  - Close confirmation dialog: "Unsaved changes. Save before closing?"

Pre-save auto-capture:
  - EditorStore.captureSnapshot() → saves { content, cursor, selection, timestamp }
    to in-memory snapshot stack (future Undo support).
```

### Save

```
User action: Ctrl+S, click Save button, or AI invokes "editor.save"
Entry: EditorStore.save()
  1. Set saving = true
  2. Emit command "editor.save" with { path: activeFile, content: currentContent }
  3. EditorHandler → WorkspaceService.writeFile(path, content) → Disk
  4. On success:
     a. Set originalContent = currentContent
     b. Set dirty = false
     c. Set lastSaved = Date.now()
     d. Set saving = false
  5. On failure:
     a. Set saving = false
     b. Set error: "Save failed: {reason}"
     c. Content preserved in buffer — no data loss
  → State: Clean (on success), Dirty + Error (on failure)
```

### Clean

```
Post-save state. dirty = false. originalContent === currentContent.
Visual indicator removed. Save button disabled (or shows "Saved").

This is the stable state. The editor may remain open with the file loaded
for continued editing, or the user may close it.

Auto-save (future): after N seconds of inactivity while dirty, trigger save.
```

### Close

```
Entry: EditorStore.close()
  1. If dirty → show confirmation dialog: "Save / Discard / Cancel"
     - Save: trigger save(), then close
     - Discard: skip save, close
     - Cancel: abort close
  2. If not dirty → close immediately
  3. Reset all state to defaults (activeFile = null, etc.)
  4. Fire "editor.closed" event
  5. (Future) Close EditorPanel, optionally open PreviewPanel for same file
```

---

## 6. Save Flow (Authoritative Path)

The only code path that writes a file to disk:

```
┌──────────────────────────────────────────────────────────────┐
│  EditorPanel (Presentation)                                  │
│    │                                                         │
│    │  User clicks Save or presses Ctrl+S                     │
│    │                                                         │
│    ▼                                                         │
│  EditorStore.save() (Application)                            │
│    │                                                         │
│    │  command.execute("editor.save", {                       │
│    │    path: state.activeFile,                              │
│    │    content: state.currentContent                        │
│    │  })                                                     │
│    │                                                         │
│    │  NEVER: window.api.workspace.write(...)                 │
│    │                                                         │
├────┼──── IPC ────────────────────────────────────────────────┤
│    │                                                         │
│    ▼                                                         │
│  EditorHandler.execute("editor.save") (Infrastructure)       │
│    │                                                         │
│    │  1. Validate path (must be within workspace root)       │
│    │  2. Validate content (non-null)                         │
│    │                                                         │
│    ▼                                                         │
│  WorkspaceService.writeFile(path, content) (Infrastructure)  │
│    │                                                         │
│    ▼                                                         │
│  WorkspaceProvider.writeFile(path, content) (Infrastructure) │
│    │                                                         │
│    │  writeFileSync(resolvedAbsolutePath, content, "utf-8")  │
│    │                                                         │
│    ▼                                                         │
│  Disk                                                        │
└──────────────────────────────────────────────────────────────┘
```

### Why This Path

1. **Principle 11 — Renderer No FS**: Renderer never touches `fs`. All writes go through IPC.
2. **Principle 18 — Interaction through Commands**: Save is a Command. It is registered, discoverable, and reusable by keyboard, UI, AI, and plugins.
3. **Single Write Gate**: `WorkspaceProvider.writeFile()` is the ONLY function in the entire codebase that calls `writeFileSync`. No other module — not EditorHandler, not RuntimeManager, not any adapter — may write files directly.
4. **Audit Trail (future)**: The single write gate enables write auditing, history recording, and external change detection at exactly one point.

### Concurrent Safety

If two saves are requested before the first completes:
- `EditorStore.saving === true` blocks the second save.
- UI disables the Save button while `saving === true`.
- Ctrl+S is also gated by `saving`.

---

## 7. Future Compatibility

The Editor architecture is designed to accommodate all planned Editor features without redesign.

### Undo / Redo

```
EditorStore maintains an in-memory snapshot stack.
Each Edit action pushes a snapshot: { content, cursor, selection, timestamp }.

EditorStore.undo():
  pop last snapshot, restore content + cursor + selection.
  Recompute dirty.

EditorStore.redo():
  push current state, pop next redo snapshot.

Undo depth: configurable (default: 100). Stack cleared on Save or file switch.

Architecture: fully contained in EditorStore (Application layer).
No IPC. No file system. No command execution.
```

### Diff

```
EditorStore.diff():
  command.execute("editor.diff", { path, content: currentContent })
  → EditorHandler
  → WorkspaceService.readFile(path) → diskContent
  → Compute unified diff (diskContent → currentContent)
  → Return DiffResult { hunks: DiffHunk[] }

Renderer displays diff in DiffOverlay or inline in EditorPanel.
Architecture: READ from disk via Command + compute diff in Main.
```

### Patch

```
AI agent generates a patch (diff format).
EditorStore.applyPatch(patch):
  command.execute("editor.apply-patch", { path, patch })
  → EditorHandler
  → Validate patch applies cleanly to currentContent
  → Apply patch
  → Return new content (does NOT write to disk)

User reviews patched content in Editor.
User explicitly saves (Ctrl+S) to write to disk.
User can undo patch via Undo.

Architecture: patch computation in Main, application in EditorStore buffer.
No auto-write. User always confirms.
```

### AI Edit

```
AI agent invokes "editor.edit" tool:
  command.execute("editor.edit", {
    path: "src/main/index.ts",
    operation: "replace",
    old_string: "...",
    new_string: "..."
  })
  → EditorHandler
  → WorkspaceService.readFile(path) → current disk content
  → Apply replace operation on disk content
  → Return proposed new content

EditorStore receives AI-proposed content.
Does NOT auto-apply. Renders inline diff.
User accepts → apply to buffer → dirty.
User rejects → discard.

Architecture: AI never writes directly. Always proposes. User always confirms.
```

### Multi-file Edit

```
EditorStore maintains EditorState[] (one per open file).
Tab bar shows all open files.
Active tab determines which EditorState is rendered.

WorkspaceService exposes batch operations (future):
  writeFiles(files: Array<{ path: string; content: string }>): void
  → Atomic file writes (best-effort, not transactional in v1).

Architecture: EditorStore arrays of EditorState.
Each file has its own dirty/saving/cursor/selection.
Tab switching does not auto-save (user must explicitly save or discard).
```

### Git Stage

```
EditorStore.gitStage():
  command.execute("editor.git-stage", { path })
  → EditorHandler
  → GitProvider.stageFile(path)

Only available when file is clean (dirty = false).
If dirty, prompt user to save first.

Architecture: Git operations through GitProvider, same as existing Git integration.
No new Provider needed.
```

### Conflict Resolve

```
EditorStore detects external modification:
  command.execute("editor.check-external-change", { path, lastSaved })
  → EditorHandler
  → WorkspaceService.stat(path) → compare mtime with lastSaved
  → If mtime > lastSaved: return { changed: true, diskContent }

If file changed externally while editor has unsaved changes:
  Show conflict dialog:
    "This file was modified outside AI Studio. Your changes will be overwritten if you save.
     [View Diff] [Overwrite (save mine)] [Reload (discard mine)]"

Architecture: no automatic conflict resolution. User decides.
```

### Auto Save

```
EditorStore config: autoSave.enabled = true/false, autoSave.delayMs = 3000

While dirty and not saving:
  After autoSave.delayMs of inactivity → trigger EditorStore.save()

Auto-save is a UI feature, not a different code path.
It calls the same EditorStore.save() → command.execute("editor.save") path.

Architecture: timer in EditorStore. No changes to EditorHandler or below.
```

### Compatibility Table

| Feature | New IPC? | New Command? | New Store? | New Provider? |
|---|---|---|---|---|
| Undo/Redo | No | No | No (just state in EditorStore) | No |
| Diff | No | Yes (`editor.diff`) | No | No |
| Patch | No | Yes (`editor.apply-patch`) | No | No |
| AI Edit | No | Yes (`editor.edit`) | No | No |
| Multi-file Edit | No | No | No (array of EditorState) | No |
| Git Stage | No | Yes (`editor.git-stage`) | No | No (uses existing GitProvider) |
| Conflict Resolve | No | Yes (`editor.check-external-change`) | No | No |
| Auto Save | No | No | No (timer in EditorStore) | No |

---

## 8. Risk Analysis

### 8.1 Large Files

**Risk**: Loading a 10 MB file into EditorStore.currentContent blocks the Renderer.

**Mitigation**:
1. EditorStore.open() checks file size via stat before loading.
2. If file > threshold (default: 1 MB), show confirmation: "This file is large. Open anyway?"
3. If file > hard limit (default: 5 MB), block: "File too large for Editor."
4. Large file editing (future): virtualized rendering, chunked loading, swap to temp file.
5. Save path unchanged — just writes the full buffer, which the Main process can handle.

**No architecture change needed.** File size check lives in EditorHandler before returning content to EditorStore.

### 8.2 Encoding

**Risk**: Files with non-UTF-8 encoding produce garbled text or write corruption.

**Mitigation**:
1. `WorkspaceProvider.readFile` currently reads as `utf-8` only. This is unchanged.
2. EditorStore.encoding defaults to `"utf-8"`.
3. EditorHandler.read returns encoding metadata alongside content.
4. Binary files (detected by null byte or extension) set `readonly = true` and block editing.
5. Future: encoding detection (BOM, charset sniffing) in WorkspaceProvider.

**Architecture supports it**: `encoding` field already in EditorState. No redesign needed.

### 8.3 Line Endings

**Risk**: Files with mixed LF/CRLF produce confusing diffs and spurious dirty flags.

**Mitigation**:
1. EditorHandler normalizes line endings to LF on load.
2. WorkspaceProvider.writeFile preserves or normalizes based on project config.
3. `originalContent` stores the normalized version — dirty comparison is against normalized.
4. Future: `.gitattributes` or `workspace/config.json` specifies line ending preference.

**No architecture change needed.** Normalization in EditorHandler.load.

### 8.4 Concurrent Modification

**Risk**: Two EditorPanels open the same file. Save from Panel A overwrites Panel B's unsaved changes.

**Mitigation**:
1. EditorStore enforces: at most one EditorState per file path.
2. Opening a file that is already open in another tab switches to that tab — no duplicate.
3. Opening a file that is already open in Preview closes Preview, switches to Editor.
4. Future: per-file locking in WorkspaceProvider (prevents multi-agent concurrent writes).

**Architecture supports it**: single EditorState per file enforced in EditorStore.

### 8.5 External Modification

**Risk**: File is modified outside AI Studio (VS Code, git checkout, terminal sed) while open in Editor.

**Mitigation**:
1. On EditorPanel focus, poll `WorkspaceService.stat(path)` and compare mtime with `lastSaved`.
2. If mtime > lastSaved: show warning banner. Do NOT auto-reload (user might have unsaved changes).
3. User decides: Reload (discard editor changes) or Ignore (overwrite on next save).
4. Future: `fs.watch` for real-time external change detection.

**Architecture supports it**: `lastSaved` timestamp enables the mtime comparison. Warning is UI-only.

### 8.6 Save Failure

**Risk**: Disk full, permission denied, or file locked → save fails.

**Mitigation**:
1. WorkspaceProvider.writeFile catches errors and returns failure.
2. EditorHandler passes the error back to EditorStore.
3. EditorStore.set({ saving: false, error: "Save failed: ENOSPC" }).
4. **Content is preserved in currentContent.** The buffer survives save failure.
5. User can retry after resolving the issue (free disk space, change permissions).
6. User can copy content to clipboard as a last resort.
7. EditorStore.hardClose() closes without confirmation in emergency.

**No data loss.** The buffer is the source of truth until save succeeds.

### 8.7 Crash Recovery

**Risk**: AI Studio crashes while Editor has unsaved changes → data loss.

**Mitigation**:
1. EditorStore writes unsaved content to `workspace/.editor/draft_<filepath_hash>.json` on every change (debounced, 2s).
2. On app restart, EditorStore checks for draft files.
3. If draft exists and is newer than disk file → show recovery dialog:
   "Unsaved changes found for {filename}. [Recover] [Discard]"
4. Recover loads the draft into EditorStore. Discard deletes the draft file.
5. After save, draft file is deleted.

**Architecture impact**: Draft persistence requires `workspace:write` IPC (already exists). No new IPC channel needed for draft writes — EditorHandler handles it implicitly. Draft files are in `.editor/`, hidden from WorkspaceExplorer.

---

## 9. Architecture Validation

The Editor architecture must not violate any existing Design Principle.

### 9.1 Renderer No FS (Principle 11)

| Check | Status |
|---|---|
| EditorStore never imports `fs`, `path`, `child_process` | ✓ By design |
| All file I/O goes through `command.execute(...)` → EditorHandler | ✓ |
| EditorPanel never calls `window.api.workspace.write(...)` directly | ✓ Enforced by code review |
| Draft recovery writes go through the same command path | ✓ |

**Verdict**: ✓ Compliant. The Renderer treats disk as a command sink, not a file system.

### 9.2 Agent Agnosticism (Principle 1)

| Check | Status |
|---|---|
| Editor state/types contain no agent/adapter name | ✓ Pure data |
| EditorHandler receives commands generically, not agent-specific | ✓ |
| AI Edit tool is registered as `editor.edit`, usable by any agent | ✓ |
| No `"hermes"` string in any Editor renderer file | ✓ Enforced by naming conventions |

**Verdict**: ✓ Compliant. Editor is an agent-agnostic capability.

### 9.3 Workspace Identity (Principle 15)

| Check | Status |
|---|---|
| EditorState.activeFile is relative to workspace root | ✓ |
| EditorHandler resolves paths through PathResolver, not independently | ✓ |
| EditorPanel shows workspace-aware file path in header | ✓ (future) |
| Multiple workspaces = separate EditorStores | ✓ |

**Verdict**: ✓ Compliant. Editor respects workspace boundaries.

### 9.4 Project Brain (Principle 16)

| Check | Status |
|---|---|
| Editor does not read or write `workspace/brain/` | ✓ Not in scope |
| Editor does not read `workspace/sessions/` | ✓ Not in scope |
| Editor draft files go to `workspace/.editor/`, a separate directory | ✓ |
| Brain can record "currently editing: path" as context metadata (future) | ✓ No conflict |

**Verdict**: ✓ Compliant. Editor uses its own storage namespace.

### 9.5 Shared Resource Model (Principle 17)

| Check | Status |
|---|---|
| EditorState is defined in `src/shared/editor/types.ts` | ✓ |
| No Electron/Node/React imports in Editor state types | ✓ |
| Main and Renderer share the same EditorState definition | ✓ |
| EditorResource (file content + metadata) reuses WorkspaceNode from shared model | ✓ |

**Verdict**: ✓ Compliant. Editor types follow the Shared Resource Model pattern.

### 9.6 Layer Isolation (Principle 2)

| Check | Status |
|---|---|
| EditorPanel → EditorStore → command.execute | ✓ Presentation → Application |
| EditorStore → command.execute (IPC boundary) | ✓ Application → Infrastructure |
| EditorHandler → WorkspaceService → WorkspaceProvider | ✓ Infrastructure only |
| No upward dependency (WorkspaceProvider never imports EditorStore) | ✓ |

**Verdict**: ✓ Compliant. Editor follows the four-layer dependency direction.

### 9.7 Interaction through Commands (Principle 18)

| Check | Status |
|---|---|
| editor.open, editor.save, editor.close are registered Commands | ✓ |
| editor.diff, editor.apply-patch, editor.edit are future Commands | ✓ |
| Ctrl+S maps to `editor.save` Command | ✓ |
| Command Palette can discover all editor commands | ✓ |
| AI agents invoke editor commands, same code path as user | ✓ |

**Verdict**: ✓ Compliant. Editor actions are Commands.

### 9.8 Full Principle Compliance Matrix

| # | Principle | Compliance | Notes |
|---|---|---|---|
| 1 | Agent Agnostic | ✓ | No agent name in Editor types or Renderer |
| 2 | Layer Isolation | ✓ | Presentation → App → Domain → Infrastructure |
| 3 | Documentation is Truth | ✓ | This document is the frozen architecture |
| 4 | Small Changes | ✓ | Editor delivered in independent milestones |
| 5 | Pure Functions | ✓ | EditorHandler operations are pure in→out |
| 6 | Explicit | ✓ | EditorState fully typed, every field documented |
| 7 | Composition | ✓ | EditorHandler composes WorkspaceService |
| 8 | Fail Fast | ✓ | Save failure → error state, content preserved |
| 9 | Naming Conventions | ✓ | editor.*, EditorStore, EditorHandler, EditorPanel |
| 10 | Configuration | ✓ | Encoding, line endings, auto-save from config |
| 11 | Renderer No FS | ✓ | All writes through command → EditorHandler → WorkspaceProvider |
| 12 | TypeScript Strict | ✓ | EditorState fully typed, no `any` |
| 13 | Tests | ✓ | EditorHandler + EditorStore are testable (future) |
| 14 | i18n | ✓ | Editor UI strings through i18n layer (future) |
| 15 | Workspace Identity | ✓ | Paths relative to workspace root |
| 16 | Project Brain | ✓ | Separate storage namespace |
| 17 | Shared Resource | ✓ | EditorState in src/shared/ |
| 18 | Commands | ✓ | All editor actions are Commands |

**Verdict**: ✓ The Editor architecture violates zero design principles.

---

## 10. Implementation Sequence (Future)

```
M12a: Architecture Freeze (this document) ← current
M12b: EditorState + EditorResource types (src/shared/editor/)
M12c: EditorStore (Zustand, open/close/save/edit/dirty tracking)
M12d: EditorHandler (workspace commands: editor.open, editor.save)
M12e: EditorPanel (read-only Monaco first)
M12f: Write capability (save to disk through Command path)
M12g: Undo/Redo stack (in EditorStore)
M12h: Dirty indicator + close confirmation
M12i: Draft recovery (workspace/.editor/)
```

### NOT in v0.3

- Inline Diff rendering (M13+)
- AI Edit integration (M13+)
- Multi-file Edit (M13+)
- Git Stage from Editor (M14+)
- Conflict Resolve UI (M14+)
- Auto Save (M12j, optional)

---

## 11. What Is Frozen vs Evolving

### FROZEN (cannot change without new architecture document or ADR)

```
  ✓ EditorState interface shape
  ✓ Editor write path: Renderer → Command → EditorHandler → WorkspaceService → WorkspaceProvider → Disk
  ✓ No direct file system access from Renderer
  ✓ Editor as Command-driven system (editor.open, editor.save, editor.close)
  ✓ Editor independent from Preview at App Root level
  ✓ Editor lifecycle: Open → Load → Edit → Dirty → Save → Clean → Close
  ✓ Shared Resource Model location: src/shared/editor/types.ts
  ✓ WorkspaceProvider.writeFile() as single write gate
  ✓ DocumentHandler: lifecycle ONLY (no content read)
  ✓ documentBridge: transport ONLY (no store access)
  ✓ Ownership: Command → CommandResult → Renderer Store (not Bridge → Multiple Stores)
```

### EVOLVING (can change per milestone)

```
  ○ EditorStore internal implementation (Zustand, signals, or custom store)
  ○ EditorPanel rendering engine (Monaco, CodeMirror, or custom)
  ○ Undo stack depth and snapshot format
  ○ Draft recovery file format and location
  ○ Auto-save delay and debounce strategy
  ○ External change detection polling interval
  ○ File size limits for Editor vs terminal-based editing
```
