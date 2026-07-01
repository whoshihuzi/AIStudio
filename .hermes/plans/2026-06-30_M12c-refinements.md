# M12c Pre-Implementation — Architectural Refinements Plan

> **For Hermes:** Implement directly per this plan. Each task is a small, verified change.

**Goal:** Apply 5 architectural refinements (DocumentId, DocumentKind, DocumentMetadata, ensureDocument, validation docs) before M12c EditorStore implementation.

**Architecture:** Extend `src/shared/editor/types.ts` with Document abstractions; refactor EditorStore to use DocumentId instead of path as primary identity; rename `open()` → `ensureDocument()`; update architecture docs.

**Tech Stack:** TypeScript (shared types), Zustand (store), Markdown (docs)

**Scope boundary:** No new UI. No new IPC. No filesystem reads. Types + store rename + docs only.

---

## Impact Analysis

### Files to modify (5):
| File | Change |
|---|---|
| `src/shared/editor/types.ts` | Add DocumentId, DocumentKind, DocumentMetadata, refactor EditorFile→Document |
| `src/renderer/stores/editor.ts` | Rename open→ensureDocument, use DocumentId, updated state shape |
| `src/renderer/components/editor/EditorToolbar.tsx` | Update to new state shape (metadata.name, metadata.id) |
| `src/renderer/components/editor/EditorPanel.tsx` | Update to new state shape (activeDocumentId) |
| `architecture/15_EDITOR_ARCHITECTURE.md` | Add Document identity decoupling rationale |

### Files NOT modified:
- `App.tsx` — only uses `isVisible`, no change needed
- `EmptyEditor.tsx` — no store access, no change
- All other files — no EditorFile references found

---

### Task 1: Extend shared/editor/types.ts with Document abstractions

**Objective:** Add DocumentId, DocumentKind, DocumentMetadata types. Refactor EditorFile→Document. Keep EditorState but decouple identity from path.

**File:** `src/shared/editor/types.ts`

**Step 1: Write the new types**

Replace the entire file with:

```typescript
// ============================================================
// Editor Resource Model — shared between Main and Renderer.
// No Electron imports. No Node.js imports. Pure data types.
// ============================================================

// ----------------------------------------------------------
// DocumentId — intentionally opaque identifier.
//
// DESIGN DECISION: DocumentId is NOT the file path.
// A Document is a logical entity that may or may not
// correspond to a file on disk. Multiple Documents
// can originate from the same file (e.g. diff view,
// AI-proposed edit, temporary scratch buffer).
//
// The implementation may use path-derived values
// internally, but NO consumer may assume DocumentId
// is a path or parse it as one.
// ----------------------------------------------------------

export type DocumentId = string;

/**
 * Create a DocumentId from a workspace-relative path.
 * The generation strategy is an internal detail.
 * Consumers must treat DocumentId as opaque.
 */
export function createDocumentId(path: string): DocumentId {
  // Current implementation: path-derived.
  // Future: may become UUID, content hash, or registry-assigned.
  return `doc:${path}`;
}

// ----------------------------------------------------------
// DocumentKind — classifies the nature of a Document.
// Currently only "file" is used; others reserved for M13+.
// ----------------------------------------------------------

export type DocumentKind =
  | "file"       // Document backed by a workspace file
  | "virtual"    // Document with no file backing (scratch, notes)
  | "generated"  // AI-generated content not yet saved
  | "diff"       // Diff/patch view of an existing file
  | "temporary"; // Ephemeral buffer, discarded on close

// ----------------------------------------------------------
// DocumentMetadata — stable metadata about a Document.
// Fields use placeholder values where not yet implemented.
// ----------------------------------------------------------

export interface DocumentMetadata {
  /** Opaque identifier. Never assume it is a path. */
  id: DocumentId;
  /** Workspace-relative path. null for virtual/generated docs. */
  path: string | null;
  /** Display name (filename for file docs, title for virtual). */
  name: string;
  /** Classification of the Document. */
  kind: DocumentKind;
  /** Lifecycle state. */
  state: "clean" | "dirty" | "saving" | "error";
  /** File encoding. Placeholder: "utf-8". */
  encoding: string;
  /** Inferred language from extension. null when unknown. */
  language: string | null;
  /** Timestamp of last open (ms since epoch). Placeholder: 0. */
  lastOpened: number;
  /** Whether the document has unsaved changes. */
  isDirty: boolean;
}

// ----------------------------------------------------------
// Document — the full Document entity.
// Metadata is always present; content is loaded on demand.
// ----------------------------------------------------------

export interface Document {
  metadata: DocumentMetadata;
}

// ----------------------------------------------------------
// EditorState — aggregate editor state (shared contract)
// ----------------------------------------------------------

export interface EditorState {
  /** All currently open Documents. */
  documents: DocumentMetadata[];
  /** The active (focused) Document id, if any. */
  activeDocumentId: DocumentId | null;
  /** Whether the editor panel is visible. */
  isVisible: boolean;
}
```

**Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: errors only in files that reference old state shape (EditorStore, EditorToolbar, EditorPanel) — none yet since we haven't changed them.

Wait — we'll fix all in sequence so typecheck passes at the end.

---

### Task 2: Adapt EditorStore to use Document abstractions

**Objective:** Rename `open()` → `ensureDocument()`. Use DocumentId as key. Integrate dirty tracking into DocumentMetadata.

**File:** `src/renderer/stores/editor.ts`

**Step 1: Rewrite the store**

Replace the entire file with:

```typescript
// ============================================================
// EditorStore — editor UI state only.
// No save(). No writeFile(). No WorkspaceProvider. No fs ops.
// This store is purely about what the editor UI shows.
// ============================================================

import { create } from "zustand";
import {
  type DocumentId,
  type DocumentMetadata,
  type DocumentKind,
  createDocumentId,
} from "@shared/editor/types";

// ----------------------------------------------------------
// ensureDocument params
// ----------------------------------------------------------

export interface EnsureDocumentParams {
  path: string;
  name: string;
  kind?: DocumentKind;
}

// ----------------------------------------------------------
// Store shape
// ----------------------------------------------------------

export interface EditorStoreState {
  /** All currently open documents, keyed by DocumentId. */
  documents: Map<DocumentId, DocumentMetadata>;
  /** The active document id, or null if nothing is focused. */
  activeDocumentId: DocumentId | null;
  /** Whether the editor panel is visible. */
  isVisible: boolean;

  /**
   * Ensure a Document exists in the store.
   * If a Document with the same id already exists, activate it.
   * Otherwise create a new DocumentMetadata entry.
   *
   * This replaces the old `open()` method.
   * The store ensures a Document exists; Views decide how to present it.
   * Preview, Editor, Search, Diff all build on this concept.
   */
  ensureDocument: (params: EnsureDocumentParams) => DocumentId;
  /** Close a document by id. */
  closeDocument: (id: DocumentId) => void;
  /** Set the active document by id. */
  setActiveDocument: (id: DocumentId) => void;
  /** Show the editor panel. */
  show: () => void;
  /** Hide the editor panel. */
  hide: () => void;
}

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function makeMetadata(params: EnsureDocumentParams): DocumentMetadata {
  const id = createDocumentId(params.path);
  return {
    id,
    path: params.path,
    name: params.name,
    kind: params.kind ?? "file",
    state: "clean",
    encoding: "utf-8",
    language: null,
    lastOpened: Date.now(),
    isDirty: false,
  };
}

// ----------------------------------------------------------
// Store
// ----------------------------------------------------------

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  documents: new Map(),
  activeDocumentId: null,
  isVisible: false,

  ensureDocument: (params: EnsureDocumentParams): DocumentId => {
    const id = createDocumentId(params.path);
    const { documents } = get();
    const existing = documents.get(id);

    if (existing) {
      set({
        activeDocumentId: id,
        isVisible: true,
      });
    } else {
      const meta = makeMetadata(params);
      const next = new Map(documents);
      next.set(id, meta);
      set({
        documents: next,
        activeDocumentId: id,
        isVisible: true,
      });
    }
    return id;
  },

  closeDocument: (id: DocumentId) => {
    const { documents, activeDocumentId } = get();
    const next = new Map(documents);
    next.delete(id);

    const remaining = Array.from(next.keys());
    const nextActive =
      activeDocumentId === id
        ? remaining[remaining.length - 1] ?? null
        : activeDocumentId;

    set({
      documents: next,
      activeDocumentId: nextActive,
      isVisible: remaining.length > 0,
    });
  },

  setActiveDocument: (id: DocumentId) => {
    if (get().documents.has(id)) {
      set({ activeDocumentId: id });
    }
  },

  show: () => set({ isVisible: true }),
  hide: () => set({ isVisible: false }),
}));
```

---

### Task 3: Update EditorToolbar to new state shape

**Objective:** Replace `activeFile.path`/`activeFile.name` with DocumentMetadata access patterns.

**File:** `src/renderer/components/editor/EditorToolbar.tsx`

**Step 1: Rewrite**

```typescript
// ============================================================
// EditorToolbar — document name, close, save (disabled).
// No real save. No auto-save. No keyboard shortcuts.
// ============================================================

import { useEditorStore } from "@/stores/editor";

export function EditorToolbar() {
  const documents = useEditorStore((s) => s.documents);
  const activeDocumentId = useEditorStore((s) => s.activeDocumentId);
  const closeDocument = useEditorStore((s) => s.closeDocument);

  const activeDoc = activeDocumentId ? documents.get(activeDocumentId) : undefined;

  if (!activeDoc) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-850 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-gray-300 font-medium truncate">
          {activeDoc.name}
        </span>
        <span className="text-xs text-gray-600 font-mono truncate hidden sm:inline">
          {activeDoc.path}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          disabled
          className="text-xs text-gray-700 cursor-not-allowed"
          title="Save (not yet implemented)"
        >
          Save
        </button>
        <button
          onClick={() => closeDocument(activeDoc.id)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

---

### Task 4: Update EditorPanel to new state shape

**Objective:** Replace `activeFile` check with `activeDocumentId` check.

**File:** `src/renderer/components/editor/EditorPanel.tsx`

**Step 1: Rewrite**

```typescript
// ============================================================
// EditorPanel — the editor surface.
// EmptyEditor when no document, Toolbar + placeholder when doc open.
// ============================================================

import { useEditorStore } from "@/stores/editor";
import { EditorToolbar } from "./EditorToolbar";
import { EmptyEditor } from "./EmptyEditor";

export function EditorPanel() {
  const activeDocumentId = useEditorStore((s) => s.activeDocumentId);

  return (
    <div className="flex-1 flex flex-col bg-gray-900 border-l border-gray-700 min-w-0">
      {activeDocumentId ? (
        <>
          <EditorToolbar />
          <div className="flex-1 flex items-center justify-center text-xs text-gray-600">
            Editor not implemented
          </div>
        </>
      ) : (
        <EmptyEditor />
      )}
    </div>
  );
}
```

---

### Task 5: Update architecture documentation

**Objective:** Add section explaining why Document identity is intentionally decoupled from file paths.

**File:** `architecture/15_EDITOR_ARCHITECTURE.md`

**Step 1: Add new section after Section 4 (EditorState Frozen Interface)**

Insert after line 163 (after the EditorState interface block) and before line 164 (before `### State Combinations`). Add:

```markdown

### 4.1 Document Identity Decoupling

**Why DocumentId is not the file path.**

The DocumentId type is defined as `type DocumentId = string` — intentionally opaque. It is NOT the workspace-relative path.

#### Rationale

1. **Multiple Documents from one file.** A single file on disk may produce several Documents simultaneously:
   - The "file" Document (open for editing)
   - A "diff" Document (comparing buffer against disk)
   - A "generated" Document (AI-proposed edit, shown as inline diff)
   - A "temporary" Document (scratch buffer, same path context)

   If DocumentId were the path, these would collide. Decoupling identity from path allows all to coexist.

2. **Virtual Documents.** Future features (scratch files, AI-generated notes, plugin-provided content) have no file path at all. They still need stable Document identity for state tracking, dirty detection, and undo/redo.

3. **Path stability is not guaranteed.** Files can be renamed, moved, or deleted while a Document is open. If DocumentId were the path, a rename would break identity. An opaque id survives path changes — the id is stable; the path field updates.

4. **Future: content-addressable identity.** A DocumentId could be a content hash, enabling automatic deduplication and cache-aware diff computation without path dependency.

#### Implementation Contract

- `createDocumentId(path)` currently derives the id from the path (`doc:<path>`) as a bootstrap.
- **No consumer may parse, decompose, or derive meaning from a DocumentId.**
- The only valid operations on a DocumentId are equality comparison and use as a Map key.
- When a consumer needs the file path, it accesses `DocumentMetadata.path` — never the id.

#### Migration Path

| Milestone | DocumentId strategy |
|---|---|
| M12b | `doc:<path>` (bootstrap) |
| M12c | `doc:<path>` (unchanged) |
| M13+ | UUID or content hash (transparent to consumers) |

No code outside `createDocumentId()` will change when the strategy evolves.
```

---

### Task 6: Verify full typecheck

Run: `npm run typecheck`

All files must pass. Fix any remaining type errors.

---

### Task 7: Verify build

Run: `npm run build`

Build must succeed. EditorPanel should render the same as before M12b.

---

### Task 8: Update CHANGELOG and TODO

Update `docs/10_CHANGELOG.md` with the refinements.
Update `docs/09_TODO.md` if needed.

---

### Task 9: Commit

```bash
git add src/shared/editor/types.ts src/renderer/stores/editor.ts src/renderer/components/editor/EditorToolbar.tsx src/renderer/components/editor/EditorPanel.tsx architecture/15_EDITOR_ARCHITECTURE.md docs/10_CHANGELOG.md docs/09_TODO.md
git commit -m "refactor(editor): decouple DocumentId from file path, add DocumentKind/Metadata, rename open→ensureDocument"
```

---

## Risks

| Risk | Mitigation |
|---|---|
| EditorToolbar/EditorPanel break due to state shape change | Rewritten inline — no partial patches |
| Map vs object in Zustand (Map doesn't trigger React re-render by default) | Zustand's `set()` with a new Map instance triggers re-render. Existing code uses `Set` (same pattern) successfully. |
| Typecheck cascade: changing types.ts breaks other files | Fix all files in sequence; final typecheck verifies no stragglers |

## Verification

1. `npm run typecheck` — zero errors
2. `npm run build` — succeeds
3. Manual: app launches, Editor panel works (open/close behavior unchanged from M12b)
