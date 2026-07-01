# M12c — Document Manager Foundation Implementation Plan

> **Goal:** Introduce a single source of truth for opened documents. Preview and Editor must never own document data — they only reference Documents.

**Architecture:** A new DocumentStore in the renderer layer owns all document instances (identity + metadata). PreviewStore and EditorStore are reduced to `activeDocumentId` references. Document content remains a placeholder field — actual content loading for preview display stays in PreviewStore's transient display state.

**Tech Stack:** Zustand stores, TypeScript interfaces (src/shared/), React components

---

## Current State Analysis

### What exists today

| Store | Owns | Problem |
|---|---|---|
| `workspace-preview.ts` | `PreviewFile` (path, name, content, size, modifiedAt) + IPC read | Owns document data directly |
| `editor.ts` | `EditorFile[]` (path, name, dirty) + open/close/setActive | Creates its own file objects |
| `WorkspaceTreeNode` | directly calls `openPreview(path)` | Bypasses document lifecycle |

Both stores independently create file identity from raw path strings. No shared document model. If Preview opens docs/index.md and Editor opens docs/index.md, they are separate objects with no connection.

### What changes

1. **New**: `src/shared/document/types.ts` — `DocumentId`, `DocumentState`, `DocumentMetadata`
2. **New**: `src/renderer/stores/document.ts` — `DocumentStore` (lifecycle, no IPC)
3. **Modified**: `workspace-preview.ts` — reduced to `activeDocumentId` + display state
4. **Modified**: `editor.ts` — reduced to `activeDocumentId` + UI state
5. **Modified**: `PreviewPanel.tsx` — reads document from DocumentStore
6. **Modified**: `EditorPanel.tsx` — reads document from DocumentStore
7. **Modified**: `EditorToolbar.tsx` — reads document from DocumentStore
8. **Modified**: `WorkspaceTreeNode.tsx` — opens document via PreviewStore (which delegates to DocumentStore)
9. **New**: `docs/document-manager-validation.md`

---

## Task 1: Create shared document types

**Objective:** Define the pure data types for the Document model — no Electron, no Node imports.

**Files:**
- Create: `src/shared/document/types.ts`

**Implementation:**

```typescript
// ============================================================
// Document Resource Model — shared between Main and Renderer.
// No Electron imports. No Node.js imports. Pure data types.
// ============================================================

// ----------------------------------------------------------
// DocumentId — opaque typed identifier
// ----------------------------------------------------------

export type DocumentId = string;

// ----------------------------------------------------------
// DocumentState — a document opened in the application
// ----------------------------------------------------------

export interface DocumentState {
  /** Unique identifier for this document instance. */
  id: DocumentId;
  /** Path relative to workspace root. */
  path: string;
  /** Display name (filename only). */
  name: string;
  /** File content placeholder. Actual content loaded by viewers. */
  content: string;
  /** File encoding (default "utf-8"). */
  encoding: string;
  /** Whether the file is read-only. */
  readonly: boolean;
  /** Timestamp when the document was opened (ms since epoch). */
  openedAt: number;
  /** Timestamp of most recent access (ms since epoch). */
  lastAccessed: number;
  /** Monotonic version counter, incremented on content changes. */
  version: number;
}

// ----------------------------------------------------------
// DocumentMetadata — summary without content
// ----------------------------------------------------------

export interface DocumentMetadata {
  id: DocumentId;
  path: string;
  name: string;
  encoding: string;
  readonly: boolean;
  openedAt: number;
  lastAccessed: number;
  version: number;
}
```

**Verification:** `npx tsc --noEmit -p tsconfig.web.json` passes (new file included via existing `src/shared/**/*` glob).

---

## Task 2: Create DocumentStore

**Objective:** Create the Zustand store that owns all document instances. No IPC. No fs. No write.

**Files:**
- Create: `src/renderer/stores/document.ts`

**Implementation:**

```typescript
// ============================================================
// DocumentStore — single source of truth for opened documents.
// No write. No save. No fs. No IPC. Pure ownership model.
// ============================================================

import { create } from "zustand";
import type { DocumentId, DocumentState, DocumentMetadata } from "@shared/document/types";

export interface DocumentStoreState {
  /** All open documents, keyed by id. */
  documents: Record<DocumentId, DocumentState>;

  /** Open a document by path. Returns existing id if already open, creates new document otherwise. */
  openDocument: (path: string) => DocumentId;

  /** Close a document by id. No-op if not found. */
  closeDocument: (id: DocumentId) => void;

  /** Get a document by id. */
  getDocument: (id: DocumentId) => DocumentState | undefined;

  /** List all open documents (metadata only, no content). */
  listDocuments: () => DocumentMetadata[];

  /** Update a document's lastAccessed timestamp. */
  touchDocument: (id: DocumentId) => void;
}

let nextVersion = 1;

function documentId(path: string): DocumentId {
  return path;
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  documents: {},

  openDocument: (path: string): DocumentId => {
    const { documents } = get();
    // Check if already open
    const existing = Object.values(documents).find((d) => d.path === path);
    if (existing) {
      const now = Date.now();
      set({
        documents: {
          ...documents,
          [existing.id]: { ...existing, lastAccessed: now },
        },
      });
      return existing.id;
    }

    // Create new document
    const id = documentId(path);
    const now = Date.now();
    const doc: DocumentState = {
      id,
      path,
      name: path.split("/").pop() ?? path,
      content: "",
      encoding: "utf-8",
      readonly: false,
      openedAt: now,
      lastAccessed: now,
      version: 1,
    };
    set({ documents: { ...documents, [id]: doc } });
    return id;
  },

  closeDocument: (id: DocumentId) => {
    const { documents } = get();
    if (!documents[id]) return;
    const next = { ...documents };
    delete next[id];
    set({ documents: next });
  },

  getDocument: (id: DocumentId): DocumentState | undefined => {
    return get().documents[id];
  },

  listDocuments: (): DocumentMetadata[] => {
    return Object.values(get().documents).map((d) => ({
      id: d.id,
      path: d.path,
      name: d.name,
      encoding: d.encoding,
      readonly: d.readonly,
      openedAt: d.openedAt,
      lastAccessed: d.lastAccessed,
      version: d.version,
    }));
  },

  touchDocument: (id: DocumentId) => {
    const { documents } = get();
    const doc = documents[id];
    if (!doc) return;
    set({
      documents: {
        ...documents,
        [id]: { ...doc, lastAccessed: Date.now() },
      },
    });
  },
}));
```

**Verification:** `npx tsc --noEmit -p tsconfig.web.json` passes.

---

## Task 3: Migrate PreviewStore to reference DocumentStore

**Objective:** Remove PreviewFile ownership. PreviewStore stores only `activeDocumentId` + display state. Content loading (IPC) happens in PreviewStore's open() but delegates document lifecycle to DocumentStore.

**Files:**
- Modify: `src/renderer/stores/workspace-preview.ts`

**Changes:**

The new PreviewStore:
- Removes `PreviewFile` interface (document metadata now in DocumentStore)
- Stores `activeDocumentId: string | null` instead of `file: PreviewFile | null`
- `open(path)` calls `DocumentStore.openDocument(path)` to get/create a document, then loads content via IPC for display
- `close()` closes the document in DocumentStore
- `refresh()` re-reads content via IPC
- Content is held as transient display state: `content: string | null`

```typescript
// ============================================================
// WorkspacePreviewStore — preview display state.
// References documents via DocumentStore. No longer owns file data.
// ============================================================

import { create } from "zustand";
import { useDocumentStore } from "./document";

export interface WorkspacePreviewState {
  activeDocumentId: string | null;
  /** Transient display content — loaded via IPC for preview only. */
  content: string | null;
  visible: boolean;
  loading: boolean;
  error: string | null;

  open: (path: string) => Promise<void>;
  close: () => void;
  refresh: () => Promise<void>;
}

export const useWorkspacePreviewStore = create<WorkspacePreviewState>((set, get) => ({
  activeDocumentId: null,
  content: null,
  visible: false,
  loading: false,
  error: null,

  open: async (path: string) => {
    set({ loading: true, error: null, visible: true, content: null, activeDocumentId: null });
    try {
      // Delegate document lifecycle to DocumentStore
      const docId = useDocumentStore.getState().openDocument(path);
      set({ activeDocumentId: docId });

      // Load content for display (IPC)
      const raw = await window.api.workspace.read(path);
      const data = raw as { content: string };
      set({ content: data.content, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  close: () => {
    const { activeDocumentId } = get();
    if (activeDocumentId) {
      useDocumentStore.getState().closeDocument(activeDocumentId);
    }
    set({ activeDocumentId: null, content: null, visible: false, error: null });
  },

  refresh: async () => {
    const { activeDocumentId } = get();
    if (!activeDocumentId) return;
    const doc = useDocumentStore.getState().getDocument(activeDocumentId);
    if (!doc) return;
    await get().open(doc.path);
  },
}));
```

**Verification:** `npx tsc --noEmit -p tsconfig.web.json` passes.

---

## Task 4: Migrate EditorStore to reference DocumentStore

**Objective:** Remove EditorFile ownership. EditorStore stores only `activeDocumentId`. Opens files via DocumentStore.

**Files:**
- Modify: `src/renderer/stores/editor.ts`

**Changes:**

```typescript
// ============================================================
// EditorStore — editor UI state only.
// References documents via DocumentStore. No longer owns file objects.
// ============================================================

import { create } from "zustand";
import { useDocumentStore } from "./document";

export interface EditorStoreState {
  /** Set of open document IDs (tabs). */
  openDocumentIds: string[];
  /** Currently active document ID. */
  activeDocumentId: string | null;
  /** Whether the editor panel is visible. */
  isVisible: boolean;

  open: (path: string) => void;
  close: (id: string) => void;
  setActive: (id: string) => void;
  show: () => void;
  hide: () => void;
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  openDocumentIds: [],
  activeDocumentId: null,
  isVisible: false,

  open: (path: string) => {
    const docId = useDocumentStore.getState().openDocument(path);
    const { openDocumentIds } = get();
    const exists = openDocumentIds.includes(docId);
    if (exists) {
      set({ activeDocumentId: docId, isVisible: true });
    } else {
      set({
        openDocumentIds: [...openDocumentIds, docId],
        activeDocumentId: docId,
        isVisible: true,
      });
    }
  },

  close: (id: string) => {
    const { openDocumentIds, activeDocumentId } = get();
    useDocumentStore.getState().closeDocument(id);
    const remaining = openDocumentIds.filter((d) => d !== id);
    const nextActive =
      activeDocumentId === id
        ? remaining[remaining.length - 1] ?? null
        : activeDocumentId;
    set({
      openDocumentIds: remaining,
      activeDocumentId: nextActive,
      isVisible: remaining.length > 0,
    });
  },

  setActive: (id: string) => {
    if (get().openDocumentIds.includes(id)) {
      set({ activeDocumentId: id });
      useDocumentStore.getState().touchDocument(id);
    }
  },

  show: () => set({ isVisible: true }),
  hide: () => set({ isVisible: false }),
}));
```

**Verification:** `npx tsc --noEmit -p tsconfig.web.json` passes.

---

## Task 5: Migrate PreviewPanel to read from DocumentStore

**Objective:** PreviewPanel gets document metadata (path, name) from DocumentStore, content from PreviewStore. No longer references `file` directly.

**Files:**
- Modify: `src/renderer/components/PreviewPanel.tsx`

**Changes:**

Replace `useWorkspacePreviewStore((s) => s.file)` with:
- `useWorkspacePreviewStore((s) => s.activeDocumentId)` — to get the document ID
- `useDocumentStore((s) => s.getDocument(activeDocumentId))` — to get document metadata
- `useWorkspacePreviewStore((s) => s.content)` — to get loaded content

The `file` variable is replaced by reading `doc` from DocumentStore and `content` from PreviewStore.

Key mapping:
- `file.name` → `doc?.name`
- `file.path` → `doc?.path`
- `file.content` → `content` (from PreviewStore)
- `file.size` → removed (PreviewStore no longer stores size)
- `file.modifiedAt` → removed (Preview no longer shows modification time)

**Verification:** `npx tsc --noEmit -p tsconfig.web.json` passes. Visual check: Preview panel still shows file name, path, and content.

---

## Task 6: Migrate EditorPanel + EditorToolbar to read from DocumentStore

**Objective:** EditorPanel and EditorToolbar get document metadata from DocumentStore by ID.

**Files:**
- Modify: `src/renderer/components/editor/EditorPanel.tsx`
- Modify: `src/renderer/components/editor/EditorToolbar.tsx`

**Changes in EditorPanel.tsx:**

Replace `useEditorStore((s) => s.activeFile)` with:
- `useEditorStore((s) => s.activeDocumentId)` — to get the document ID
- `useDocumentStore((s) => activeDocumentId ? s.getDocument(activeDocumentId) : undefined)` — to get document metadata

**Changes in EditorToolbar.tsx:**

Replace `useEditorStore((s) => s.activeFile)` with:
- `useEditorStore((s) => s.activeDocumentId)` — to get the document ID
- `useDocumentStore((s) => activeDocumentId ? s.getDocument(activeDocumentId) : undefined)` — to get document metadata for display (name, path)
- `close(activeDocumentId)` instead of `close(activeFile.path)` — close by document ID

**Verification:** `npx tsc --noEmit -p tsconfig.web.json` passes. Visual check: Editor toolbar still shows file name and path.

---

## Task 7: Migrate App.tsx (if needed)

**Objective:** App.tsx currently reads `previewVisible` and `editorVisible` from stores. Check if any changes needed after migration.

**Files:**
- Check: `src/renderer/App.tsx`

**Analysis:** `previewVisible` and `editorVisible` still exist in the migrated stores, so App.tsx should need no changes. Verify.

**Verification:** `npx tsc --noEmit -p tsconfig.web.json` passes with App.tsx unchanged.

---

## Task 8: Clean up shared/editor/types.ts

**Objective:** The `EditorFile` and `EditorState` types in `src/shared/editor/types.ts` are no longer used. EditorFile is replaced by `DocumentState`. Remove unused exports.

**Files:**
- Modify: `src/shared/editor/types.ts`

**Changes:** Remove `EditorFile` and `EditorState` interfaces. Keep the file but leave it as a module re-exporting from document types, or remove it entirely if nothing references it.

Actually: search for all references to `EditorFile` and `EditorState` — if only the editor store was using them, remove the file entirely. If anything else references them, update those references.

**Verification:** `npx tsc --noEmit -p tsconfig.web.json` passes. `npx tsc --noEmit -p tsconfig.node.json` passes.

---

## Task 9: Create validation document

**Objective:** Create `docs/document-manager-validation.md` verifying the document manager correctness.

**Files:**
- Create: `docs/document-manager-validation.md`

**Validation sections:**

1. **Single Document**: openDocument creates one document, returns id, getDocument returns it
2. **Multiple Viewers**: Two different viewers (Preview + Editor) reference same document ID
3. **Multiple Editors (future)**: EditorStore tracks multiple openDocumentIds in tabs
4. **Preview + Editor Same Document**: Both stores have same activeDocumentId, getDocument returns same instance
5. **Preview + Editor Different Document**: Each store has different activeDocumentId, getDocument returns distinct instances
6. **Close Document**: closeDocument removes from DocumentStore, both viewers clear their references
7. **Reference Cleanup**: After close, getDocument returns undefined, no dangling references

**Verification:** Document exists and covers all scenarios.

---

## Task 10: Update TODO and CHANGELOG

**Objective:** Mark M12c complete in TODO, add CHANGELOG entry.

**Files:**
- Modify: `docs/09_TODO.md`
- Modify: `docs/10_CHANGELOG.md`

**Verification:** TODO line reads `[x] M12c: Document Manager Foundation`. CHANGELOG has entry for today.

---

## Task 11: Typecheck final verification

**Objective:** Full typecheck pass across all tsconfig files.

**Command:**
```bash
npx tsc --noEmit -p tsconfig.web.json && npx tsc --noEmit -p tsconfig.node.json
```

**Expected:** Both pass with zero errors.

---

## Task 12: Build verification

**Objective:** Ensure the electron-vite build succeeds.

**Command:**
```bash
npm run build
```

**Expected:** Build completes without errors.

---

## Task 13: Commit

```bash
git add src/shared/document/types.ts src/renderer/stores/document.ts src/renderer/stores/workspace-preview.ts src/renderer/stores/editor.ts src/renderer/components/PreviewPanel.tsx src/renderer/components/editor/EditorPanel.tsx src/renderer/components/editor/EditorToolbar.tsx docs/document-manager-validation.md docs/09_TODO.md docs/10_CHANGELOG.md
git commit -m "feat(document): M12c introduce shared Document Manager"
```

---

## Risks

1. **IPC dependency in PreviewStore**: The PreviewStore still calls `window.api.workspace.read(path)` for content loading. This is acceptable — the DocumentStore is about ownership/lifecycle, not about content loading.

2. **EditorFile removal**: If any other module imports `EditorFile` from `@shared/editor/types`, those imports will break. Search and fix before removing.

3. **WorkspaceTreeNode**: Currently calls `openPreview(node.path)` directly. This still works because PreviewStore.open() is unchanged on the surface — it just internally delegates to DocumentStore.

## Principles Compliance

- **Agent Agnosticism**: N/A (no agent code involved)
- **Layer Isolation**: Document types in `src/shared/` (no Electron imports ✓), DocumentStore in `src/renderer/stores/` (no Main process imports ✓)
- **Small, Reversible Changes**: Each task modifies one file at a time, easy to revert
- **Pure Functions Over Side Effects**: DocumentStore operations are pure state transitions
- **Documentation is Source of Truth**: Validation doc created before completion
