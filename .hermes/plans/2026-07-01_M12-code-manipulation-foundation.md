# M12 — Code Manipulation Foundation Implementation Plan

> **For Hermes:** Execute this plan task-by-task, following the architecture frozen in `architecture/15_EDITOR_ARCHITECTURE.md`.

**Goal:** Establish the write audit trail and diff computation foundation — the core primitives that all future code manipulation (save, diff, patch, AI edit) depend on.

**Architecture:** Write Audit intercepts the single write gate (`WorkspaceProvider.writeFile`) to record all disk mutations. Diff computation is a pure function operating on two strings, exposed via the `editor.diff` Command, callable by both humans and AI agents.

**Tech Stack:** TypeScript (strict), Node.js `diff` module (for unified diff), Zustand (EditorStore), IPC through existing `command:execute` channel.

---

## Context

### What Already Exists

- `src/shared/editor/types.ts` — DocumentMetadata (path, name, content, size, modifiedAt, language)
- `src/renderer/stores/editor.ts` — EditorStore (open, close, setActive, openDocumentIds, activeDocumentId, dirtyDocumentIds, editorVisible). No content/save/dirty tracking.
- `src/renderer/stores/document.ts` — DocumentStore (documents Map, upsert, get, remove)
- `src/renderer/components/editor/EditorPanel.tsx` — Stub ("Editor not implemented")
- `src/renderer/components/editor/EditorToolbar.tsx` — Stub (Save button disabled)
- `src/renderer/components/editor/EmptyEditor.tsx` — Empty state
- `src/renderer/runtime/document-bridge.ts` — Transport-only bridge (IPC → CommandResult)
- `src/main/runtime/commands/handlers/DocumentHandler.ts` — Lifecycle only (ensure, activate, reveal, close). NEVER reads/writes file content.
- `src/main/workspace/WorkspaceService.ts` — Proxy over WorkspaceProvider. Has `writeFile`, `readFile`, `readFileNode`, `exists`, `stat`, etc.
- `src/main/workspace/WorkspaceProvider.ts` — Single write gate (`writeFileSync`). This is where write audit hooks in.
- `src/main/runtime/commands/DefaultCommandRegistry.ts` — Currently 17 commands, no `editor.*` commands
- `src/main/runtime/commands/CommandHandler.ts` — Interface: `execute(context, commandId) → CommandResult`
- `src/shared/command/types.ts` — CommandContext, CommandResult, CommandDefinition

### Architecture Rules (FROZEN)

1. Renderer NEVER touches `fs` — all writes through `command.execute → EditorHandler → WorkspaceService`
2. `WorkspaceProvider.writeFile()` is the ONLY function that calls `writeFileSync`
3. EditorState (from architecture doc) is the frozen contract:
   ```
   activeFile, originalContent, currentContent, dirty, saving, encoding, lastSaved, cursor, selection, language, readonly
   ```
4. DocumentHandler: lifecycle ONLY (no content read/write)
5. documentBridge: transport ONLY (no store access)

---

## Task Breakdown

### Task 1: Write Audit — Shared Types

**Objective:** Define the audit entry type in shared space, reusable by Main and future Renderer consumers.

**Files:**
- Create: `src/shared/editor/audit.ts`

**Step 1: Create audit types**

```typescript
// src/shared/editor/audit.ts
// ============================================================
// Write Audit — shared resource model.
// Records every disk mutation through the single write gate.
// ============================================================

export type WriteOperation = "create" | "update" | "delete";

export interface WriteAuditEntry {
  /** Workspace-relative path of the mutated file. */
  path: string;
  /** What kind of mutation occurred. */
  operation: WriteOperation;
  /** File size in bytes after the write. */
  size: number;
  /** Timestamp of the write (ms since epoch). */
  timestamp: number;
  /** SHA-256 hash of the content after write (optional, for integrity). */
  contentHash?: string;
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 3: Commit**

```bash
git add src/shared/editor/audit.ts
git commit -m "feat(editor): add WriteAuditEntry shared type"
```

---

### Task 2: Write Audit — WriteAuditTrail (In-Memory Store)

**Objective:** Create an in-memory audit trail that records write operations and supports queries (recent, since, for-path).

**Files:**
- Create: `src/main/workspace/WriteAuditTrail.ts`

**Step 1: Implement WriteAuditTrail**

```typescript
// src/main/workspace/WriteAuditTrail.ts
import type { WriteAuditEntry, WriteOperation } from "../../shared/editor/audit.js";

export interface IWriteAuditTrail {
  record(path: string, operation: WriteOperation, size: number): void;
  recent(count?: number): WriteAuditEntry[];
  since(timestamp: number): WriteAuditEntry[];
  forPath(path: string): WriteAuditEntry[];
  clear(): void;
}

export class WriteAuditTrail implements IWriteAuditTrail {
  private entries: WriteAuditEntry[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  record(path: string, operation: WriteOperation, size: number): void {
    const entry: WriteAuditEntry = {
      path,
      operation,
      size,
      timestamp: Date.now(),
    };
    this.entries.push(entry);
    // Circular buffer: keep only the most recent maxEntries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  recent(count: number = 20): WriteAuditEntry[] {
    return this.entries.slice(-count).reverse();
  }

  since(timestamp: number): WriteAuditEntry[] {
    return this.entries
      .filter((e) => e.timestamp >= timestamp)
      .reverse();
  }

  forPath(path: string): WriteAuditEntry[] {
    return this.entries
      .filter((e) => e.path === path)
      .reverse();
  }

  clear(): void {
    this.entries = [];
  }
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit --files src/main/workspace/WriteAuditTrail.ts`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/main/workspace/WriteAuditTrail.ts
git commit -m "feat(editor): add WriteAuditTrail in-memory audit store"
```

---

### Task 3: Write Audit — Integrate into WorkspaceProvider

**Objective:** Hook WriteAuditTrail into the single write gate (`WorkspaceProvider.writeFile`). Also hook `delete` and `mkdir` operations for completeness.

**Files:**
- Modify: `src/main/workspace/WorkspaceProvider.ts` — inject audit trail, record on write
- Modify: `src/main/workspace/WorkspaceService.ts` — expose audit trail instance

**Step 1: Read WorkspaceProvider to understand current implementation**

Read `src/main/workspace/WorkspaceProvider.ts`.

**Step 2: Inject WriteAuditTrail**

Add an optional `auditTrail` parameter to WorkspaceProvider constructor. Record entries on `writeFile`, `delete`, and `mkdir` operations.

```typescript
// In WorkspaceProvider constructor:
constructor(
  rootProvider: WorkspaceRootProvider,
  resolver: PathResolver,
  auditTrail?: WriteAuditTrail,
)

// In writeFile method, after successful write:
this.auditTrail?.record(relPath, "update" | "create", content.length);

// In delete method, after successful delete:
this.auditTrail?.record(relPath, "delete", 0);

// In mkdir method:
this.auditTrail?.record(relPath, "create", 0);
```

**Step 3: Expose in WorkspaceService**

```typescript
// In WorkspaceService:
private readonly auditTrail = new WriteAuditTrail(1000);
// Pass to WorkspaceProvider constructor
// Expose getter:
getAuditTrail(): IWriteAuditTrail { return this.auditTrail; }
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 5: Commit**

```bash
git add src/main/workspace/WorkspaceProvider.ts src/main/workspace/WorkspaceService.ts
git commit -m "feat(editor): integrate WriteAuditTrail into WorkspaceProvider single write gate"
```

---

### Task 4: Diff — Shared Types

**Objective:** Define DiffResult and DiffHunk in shared space.

**Files:**
- Create: `src/shared/editor/diff.ts`

**Step 1: Create diff types**

```typescript
// src/shared/editor/diff.ts
// ============================================================
// Diff Resource Model — shared between Main and Renderer.
// ============================================================

export type DiffLineType = "added" | "removed" | "unchanged";

export interface DiffLine {
  type: DiffLineType;
  /** Line number in the original (old) file (1-indexed, 0 if added). */
  oldLineNumber: number;
  /** Line number in the new file (1-indexed, 0 if removed). */
  newLineNumber: number;
  content: string;
}

export interface DiffHunk {
  /** Starting line in the old file (1-indexed). */
  oldStart: number;
  /** Number of lines in old file chunk. */
  oldCount: number;
  /** Starting line in the new file (1-indexed). */
  newStart: number;
  /** Number of lines in new file chunk. */
  newCount: number;
  /** Context heading (function name, etc.) — empty for now. */
  heading: string;
  lines: DiffLine[];
}

export interface DiffResult {
  /** Workspace-relative path of the file. */
  path: string;
  /** Computed diff hunks. Empty array means no changes. */
  hunks: DiffHunk[];
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 3: Commit**

```bash
git add src/shared/editor/diff.ts
git commit -m "feat(editor): add DiffResult and DiffHunk shared types"
```

---

### Task 5: Diff — Pure Diff Computer

**Objective:** Implement a pure function `computeDiff(oldContent, newContent, contextLines)` that produces `DiffHunk[]`. Use line-by-line diff (no external dependency — keep it simple for the skeleton).

**Files:**
- Create: `src/main/editor/DiffComputer.ts`

**Step 1: Implement DiffComputer**

```typescript
// src/main/editor/DiffComputer.ts
import type { DiffLine, DiffHunk, DiffResult } from "../../shared/editor/diff.js";

export function computeDiff(
  oldContent: string,
  newContent: string,
  contextLines: number = 3,
): DiffHunk[] {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  // Use LCS-based diff algorithm
  const ops = diffLines(oldLines, newLines);
  return buildHunks(ops, contextLines);
}

// LCS-based line diff
function diffLines(oldLines: string[], newLines: string[]): Array<{
  type: "equal" | "insert" | "delete";
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
}> {
  const m = oldLines.length;
  const n = newLines.length;
  
  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce edit operations
  const ops: Array<{
    type: "equal" | "insert" | "delete";
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
  }> = [];

  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.unshift({ type: "equal", oldStart: i - 1, oldCount: 1, newStart: j - 1, newCount: 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "insert", oldStart: i, oldCount: 0, newStart: j - 1, newCount: 1 });
      j--;
    } else {
      ops.unshift({ type: "delete", oldStart: i - 1, oldCount: 1, newStart: j, newCount: 0 });
      i--;
    }
  }

  return ops;
}

function buildHunks(
  ops: Array<{ type: "equal" | "insert" | "delete"; oldStart: number; oldCount: number; newStart: number; newCount: number }>,
  contextLines: number,
): DiffHunk[] {
  // Range-expand hunks: each hunk is a change block + contextLines before & after
  const hunks: DiffHunk[] = [];
  // ... implementation ...
  return hunks;
}

export function computeFileDiff(
  path: string,
  oldContent: string,
  newContent: string,
): DiffResult {
  return {
    path,
    hunks: computeDiff(oldContent, newContent),
  };
}
```

Note: The full LCS + hunk building algorithm is verbose. Use a pragmatic approach:
- Simple LCS for line matching
- Group contiguous changes into hunks
- Add context lines around each hunk

**Step 2: Write unit test**

Create: `src/main/editor/__tests__/DiffComputer.test.ts`

Test cases:
- Identical content → empty hunks
- Single line added
- Single line removed  
- Single line changed (remove + add)
- Multi-line changes
- Context lines included in hunks

**Step 3: Verify tests pass**

Run: `npx jest src/main/editor/__tests__/DiffComputer.test.ts --passWithNoTests`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/main/editor/DiffComputer.ts src/main/editor/__tests__/DiffComputer.test.ts
git commit -m "feat(editor): add pure DiffComputer with LCS-based line diff"
```

---

### Task 6: EditorHandler — Main Process Command Handler

**Objective:** Create the EditorHandler implementing `CommandHandler`. Wires `editor.open`, `editor.save`, `editor.diff` commands.

**Files:**
- Create: `src/main/runtime/commands/handlers/EditorHandler.ts`

**Step 1: Implement EditorHandler**

```typescript
// src/main/runtime/commands/handlers/EditorHandler.ts
import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";
import { workspaceService } from "../../../workspace/WorkspaceService.js";
import { computeDiff } from "../../../editor/DiffComputer.js";

export class EditorHandler implements CommandHandler {
  async execute(context: CommandContext, commandId: string): Promise<CommandResult> {
    switch (commandId) {
      case "editor.open":
        return this.open(context);
      case "editor.save":
        return this.save(context);
      case "editor.diff":
        return this.diff(context);
      default:
        return {
          success: false,
          commandId,
          error: `EditorHandler: unknown command "${commandId}".`,
        };
    }
  }

  private open(context: CommandContext): CommandResult {
    const path = context.selectedFile || (context.args?.path as string);
    if (!path) {
      return { success: false, commandId: "editor.open", error: "No file path provided." };
    }
    try {
      const { node, content } = workspaceService.readFileNode(path);
      return {
        success: true,
        commandId: "editor.open",
        payload: {
          path,
          content,
          name: node.name,
          size: node.size,
          language: node.language,
          modifiedAt: node.modifiedAt,
        },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "editor.open",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private save(context: CommandContext): CommandResult {
    const path = (context.args?.path as string) || context.selectedFile;
    const content = context.args?.content as string;
    if (!path) {
      return { success: false, commandId: "editor.save", error: "No file path provided." };
    }
    if (content === undefined || content === null) {
      return { success: false, commandId: "editor.save", error: "No content provided." };
    }
    try {
      workspaceService.writeFile(path, content);
      return {
        success: true,
        commandId: "editor.save",
        payload: { path, size: content.length, savedAt: Date.now() },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "editor.save",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private diff(context: CommandContext): CommandResult {
    const path = (context.args?.path as string) || context.selectedFile;
    const newContent = context.args?.content as string;
    if (!path) {
      return { success: false, commandId: "editor.diff", error: "No file path provided." };
    }
    if (newContent === undefined || newContent === null) {
      return { success: false, commandId: "editor.diff", error: "No content provided for diff." };
    }
    try {
      const diskContent = workspaceService.readFile(path).content;
      const hunks = computeDiff(diskContent, newContent);
      return {
        success: true,
        commandId: "editor.diff",
        payload: { path, hunks },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "editor.diff",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
```

**Step 2: Register in workspaceService singleton**

Ensure `workspaceService` singleton import path is correct. Current path: `"../../../workspace/WorkspaceService.js"`

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 4: Commit**

```bash
git add src/main/runtime/commands/handlers/EditorHandler.ts
git commit -m "feat(editor): add EditorHandler with editor.open/save/diff commands"
```

---

### Task 7: Register Editor Commands in DefaultCommandRegistry

**Objective:** Add `editor.open`, `editor.save`, `editor.diff`, `editor.apply-patch` command definitions. Wire EditorHandler in main index.ts.

**Files:**
- Modify: `src/main/runtime/commands/DefaultCommandRegistry.ts` — add editor commands
- Modify: `src/main/index.ts` — register EditorHandler with CommandExecutor

The default commands list already uses stubs. Add editor commands following the same pattern:

```typescript
// In defaultCommands array:
{
  id: "editor.open",
  title: "Open in Editor",
  description: "Open a file in the Editor for modification. Loads content from disk.",
  category: "workspace",
  keywords: ["editor", "open", "edit", "file"],
  shortcut: "Ctrl+O",
},
{
  id: "editor.save",
  title: "Save File",
  description: "Save the current editor buffer to disk through the single write gate.",
  category: "workspace",
  keywords: ["editor", "save", "write", "file"],
  shortcut: "Ctrl+S",
},
{
  id: "editor.diff",
  title: "Show Diff",
  description: "Compare current editor content with the disk version.",
  category: "workspace",
  keywords: ["editor", "diff", "compare", "changes"],
},
{
  id: "editor.apply-patch",
  title: "Apply Patch",
  description: "Apply a diff patch to a file (skeleton — implementation in M13).",
  category: "workspace",
  keywords: ["editor", "patch", "apply", "diff"],
},
```

Register EditorHandler in `main/index.ts`:
```typescript
import { EditorHandler } from "./runtime/commands/handlers/EditorHandler.js";
// ...
const editorHandler = new EditorHandler();
executor.register("editor.open", editorHandler);
executor.register("editor.save", editorHandler);
executor.register("editor.diff", editorHandler);
executor.register("editor.apply-patch", editorHandler);
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 3: Commit**

```bash
git add src/main/runtime/commands/DefaultCommandRegistry.ts src/main/index.ts
git commit -m "feat(editor): register editor commands and EditorHandler"
```

---

### Task 8: Update EditorStore — Wire Save Flow

**Objective:** Add `currentContent`, `originalContent`, `dirty`, `saving` state fields to EditorStore. Wire the `save()` method through `command.execute("editor.save")`.

**Files:**
- Modify: `src/renderer/stores/editor.ts` — add content/save/dirty state + save() method via documentBridge

**Step 1: Extend EditorStoreState**

Add to the interface:
```typescript
currentContent: string | null;
originalContent: string | null;
dirty: boolean;
saving: boolean;
saveError: string | null;
```

Add methods:
```typescript
loadContent: (path: string) => Promise<void>;
setContent: (content: string) => void;
save: () => Promise<void>;
reset: () => void;
```

**Step 2: Implement loadContent**

```typescript
loadContent: async (path: string) => {
  const result = await documentBridge<{
    path: string; content: string; name: string; size: number; language?: string; modifiedAt?: number;
  }>("editor.open", { path });
  
  if (result.success) {
    const { content, name, size, language, modifiedAt } = result.payload;
    // Update DocumentStore
    const docStore = useDocumentStore.getState();
    docStore.upsert({ path, name, content, size, modifiedAt, language });
    // Update EditorStore
    set({
      originalContent: content,
      currentContent: content,
      dirty: false,
      saving: false,
      saveError: null,
    });
  } else {
    set({ saveError: result.error ?? "Failed to load file" });
  }
},
```

**Step 3: Implement setContent**

```typescript
setContent: (content: string) => {
  const { originalContent } = get();
  set({
    currentContent: content,
    dirty: content !== originalContent,
  });
},
```

**Step 4: Implement save**

```typescript
save: async () => {
  const { activeDocumentId, currentContent, saving } = get();
  if (!activeDocumentId || currentContent === null || saving) return;
  
  set({ saving: true, saveError: null });
  
  const result = await documentBridge<{ path: string; size: number; savedAt: number }>(
    "editor.save",
    { path: activeDocumentId, content: currentContent },
  );
  
  if (result.success) {
    set({
      originalContent: currentContent,
      dirty: false,
      saving: false,
      saveError: null,
    });
  } else {
    set({
      saving: false,
      saveError: result.error ?? "Save failed",
    });
  }
},
```

**Step 5: Implement reset**

```typescript
reset: () => {
  set({
    currentContent: null,
    originalContent: null,
    dirty: false,
    saving: false,
    saveError: null,
  });
},
```

Modify `open()` to call `loadContent`:
```typescript
open: (path: string, name?: string) => {
  // ... existing logic ...
  // After setting activeDocumentId:
  get().loadContent(path);
},
```

Modify `close()` to reset content state:
```typescript
// At end of close():
set({ ..., currentContent: null, originalContent: null, dirty: false, saving: false, saveError: null });
```

**Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 7: Commit**

```bash
git add src/renderer/stores/editor.ts
git commit -m "feat(editor): wire EditorStore save flow through command.execute"
```

---

### Task 9: Update EditorPanel — TextArea-Based Editor

**Objective:** Replace the "Editor not implemented" placeholder with a working textarea editor. Wire Ctrl+S to save. Show dirty indicator.

**Files:**
- Modify: `src/renderer/components/editor/EditorPanel.tsx`
- Modify: `src/renderer/components/editor/EditorToolbar.tsx`

**Step 1: Update EditorPanel with textarea**

```tsx
export function EditorPanel() {
  const activeDocumentId = useEditorStore((s) => s.activeDocumentId);
  const currentContent = useEditorStore((s) => s.currentContent);
  const dirty = useEditorStore((s) => s.dirty);
  const saving = useEditorStore((s) => s.saving);
  const setContent = useEditorStore((s) => s.setContent);
  const save = useEditorStore((s) => s.save);
  const doc = activeDocumentId
    ? useDocumentStore((s) => s.get(activeDocumentId))
    : undefined;

  // Ctrl+S handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  return (
    <div className="flex-1 flex flex-col bg-gray-900 border-l border-gray-700 min-w-0">
      {doc ? (
        <>
          <EditorToolbar />
          <textarea
            className="flex-1 bg-gray-950 text-gray-200 text-sm font-mono p-4 resize-none outline-none border-0"
            value={currentContent ?? ""}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            readOnly={saving}
          />
        </>
      ) : (
        <EmptyEditor />
      )}
    </div>
  );
}
```

**Step 2: Update EditorToolbar with working Save button**

```tsx
export function EditorToolbar() {
  const activeDocumentId = useEditorStore((s) => s.activeDocumentId);
  const dirty = useEditorStore((s) => s.dirty);
  const saving = useEditorStore((s) => s.saving);
  const save = useEditorStore((s) => s.save);
  const close = useEditorStore((s) => s.close);
  const doc = activeDocumentId
    ? useDocumentStore((s) => s.get(activeDocumentId))
    : undefined;

  if (!doc) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-850 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-gray-300 font-medium truncate">
          {doc.name}
        </span>
        {dirty && (
          <span className="text-xs text-yellow-500" title="Unsaved changes">●</span>
        )}
        <span className="text-xs text-gray-600 font-mono truncate hidden sm:inline">
          {doc.path}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className={`text-xs px-2 py-1 rounded ${
            dirty && !saving
              ? "text-blue-400 hover:text-blue-300 hover:bg-gray-800"
              : "text-gray-700 cursor-not-allowed"
          }`}
          title={saving ? "Saving..." : dirty ? "Save (Ctrl+S)" : "Saved"}
        >
          {saving ? "Saving..." : dirty ? "Save" : "Saved"}
        </button>
        <button
          onClick={() => close(doc.path)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 4: Commit**

```bash
git add src/renderer/components/editor/EditorPanel.tsx src/renderer/components/editor/EditorToolbar.tsx
git commit -m "feat(editor): wire textarea editor with save/dirty tracking"
```

---

### Task 10: End-to-End Verification

**Objective:** Build the project and verify the Editor lifecycle: Open → Edit → Dirty → Save → Clean → Close.

**Files:**
- None (verification only)

**Step 1: Typecheck**

Run: `npm run typecheck`
Expected: No errors.

**Step 2: Build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Manual verification checklist**

- [ ] Double-click a file in WorkspaceExplorer → opens in EditorPanel
- [ ] Editor shows file content in textarea
- [ ] Type in textarea → dirty indicator (● yellow dot) appears
- [ ] Save button becomes enabled when dirty
- [ ] Ctrl+S saves content to disk
- [ ] After save → dirty indicator disappears, Save shows "Saved"
- [ ] Close file → Editor returns to EmptyEditor
- [ ] Open same file again → content matches saved version
- [ ] Command Palette (Ctrl+P) shows `editor.open`, `editor.save`, `editor.diff`
- [ ] Execute `editor.diff` via Command Palette → returns diff hunks

**Step 4: Verify write audit**

Run a verification script that:
1. Opens a file in Editor
2. Modifies and saves it
3. Checks `WorkspaceService.getAuditTrail().recent()` shows the write

---

## Verification Commands

```bash
npm run typecheck    # TypeScript strict check
npm run build        # Full electron-vite build
npm run dev          # Start dev server for manual testing
```

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| DiffComputer LCS O(n²) on large files | Slow diff for files > 10K lines | Acceptable for skeleton — file size limit (1MB/10K lines) applied in EditorHandler.open |
| EditorStore.loadContent is async inside synchronous zustand set | React re-render timing | Existing patterns in codebase use similar approach |
| Ctrl+S keydown may conflict with browser default | Save dialog | `e.preventDefault()` handles this |

---

## Files Summary

| File | Action |
|---|---|
| `src/shared/editor/audit.ts` | Create — WriteAuditEntry type |
| `src/shared/editor/diff.ts` | Create — DiffResult, DiffHunk, DiffLine types |
| `src/main/workspace/WriteAuditTrail.ts` | Create — In-memory audit trail |
| `src/main/workspace/WorkspaceProvider.ts` | Modify — Inject WriteAuditTrail |
| `src/main/workspace/WorkspaceService.ts` | Modify — Expose audit trail |
| `src/main/editor/DiffComputer.ts` | Create — Pure diff computation |
| `src/main/editor/__tests__/DiffComputer.test.ts` | Create — Unit tests |
| `src/main/runtime/commands/handlers/EditorHandler.ts` | Create — editor.open/save/diff |
| `src/main/runtime/commands/DefaultCommandRegistry.ts` | Modify — Add editor commands |
| `src/main/index.ts` | Modify — Register EditorHandler |
| `src/renderer/stores/editor.ts` | Modify — Add content/save/dirty state |
| `src/renderer/components/editor/EditorPanel.tsx` | Modify — Wire textarea |
| `src/renderer/components/editor/EditorToolbar.tsx` | Modify — Working Save button |

---

## Out of Scope (M13+)

- Undo/Redo stack
- File close confirmation dialog (unsaved changes prompt)
- External change detection
- Auto-save
- Crash recovery drafts
- Patch application (`editor.apply-patch` handler — command definition registered, no implementation)
- AI Edit integration
- Monaco/CodeMirror — textarea is sufficient for M12 skeleton
