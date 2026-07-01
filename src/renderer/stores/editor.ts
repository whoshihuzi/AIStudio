// ============================================================
// EditorStore — editor UI state.
// References Documents by path only. Metadata lives in DocumentStore.
// M12: added content/save/dirty state + save flow through command.execute.
// Sprint 5: added diff state + accept/reject + applyPatch.
// ============================================================

import { create } from "zustand";
import { useDocumentStore } from "@/stores/document";
import { documentBridge } from "@/runtime/document-bridge";
import type { DiffHunk, DiffResult } from "@shared/editor/diff";

export interface EditorStoreState {
  /** Paths of currently open documents (tabs). */
  openDocumentIds: string[];
  /** Path of the active (focused) document, if any. */
  activeDocumentId: string | null;
  /** Paths with unsaved editor changes. */
  dirtyDocumentIds: Set<string>;
  /** Whether the editor panel is visible. */
  editorVisible: boolean;

  // ── M12: Content + Save state ──

  /** Current editor buffer content (may differ from disk). */
  currentContent: string | null;
  /** Original content loaded from disk (for dirty comparison). */
  originalContent: string | null;
  /** Whether currentContent differs from originalContent. */
  dirty: boolean;
  /** Whether a save operation is in progress. */
  saving: boolean;
  /** Last save error message, if any. */
  saveError: string | null;

  // ── Sprint 5: Diff state ──

  /** Computed diff between currentContent and disk version. */
  diffResult: DiffResult | null;
  /** Whether the diff view is currently shown. */
  diffVisible: boolean;
  /** Error message from the last diff computation, if any. */
  diffError: string | null;
  /** Hunks currently being processed (accept/reject in flight). */
  processingHunks: Set<number>;

  // ── Document lifecycle ──

  open: (path: string, name?: string) => void;
  close: (path: string) => void;
  setActive: (path: string) => void;
  show: () => void;
  hide: () => void;

  // ── M12: Content + Save ──

  /** Load file content from disk via editor.open command. */
  loadContent: (path: string) => Promise<void>;
  /** Update the in-memory editor buffer content. */
  setContent: (content: string) => void;
  /** Save current content to disk via editor.save command. */
  save: () => Promise<void>;
  /** Reset content state (called on close). */
  resetContent: () => void;

  // ── Sprint 5: Diff + Accept/Reject + Patch ──

  /** Compute diff between current editor content and disk version. */
  diff: () => Promise<void>;
  /** Hide diff view and return to editor. */
  hideDiff: () => void;
  /** Accept a single hunk — apply its changes to currentContent. */
  acceptHunk: (hunkIndex: number) => void;
  /** Reject a single hunk — revert its changes from currentContent. */
  rejectHunk: (hunkIndex: number) => void;
  /** Accept all hunks — apply all changes to currentContent. */
  acceptAll: () => void;
  /** Reject all hunks — revert all changes, restore originalContent. */
  rejectAll: () => void;
  /** Apply a patch string to current content (validate first). */
  applyPatch: (patch: string) => Promise<void>;
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  openDocumentIds: [],
  activeDocumentId: null,
  dirtyDocumentIds: new Set(),
  editorVisible: false,

  currentContent: null,
  originalContent: null,
  dirty: false,
  saving: false,
  saveError: null,

  // ── Sprint 5: Diff state ──
  diffResult: null,
  diffVisible: false,
  diffError: null,
  processingHunks: new Set(),

  // ── Document lifecycle ──

  open: (path: string, name?: string) => {
    const { openDocumentIds } = get();

    // Ensure basic metadata exists in DocumentStore
    const docStore = useDocumentStore.getState();
    if (!docStore.documents.has(path)) {
      docStore.upsert({ path, name: name ?? path.split("/").pop() ?? path });
    }

    if (openDocumentIds.includes(path)) {
      set({ activeDocumentId: path, editorVisible: true });
    } else {
      set({
        openDocumentIds: [...openDocumentIds, path],
        activeDocumentId: path,
        editorVisible: true,
      });
    }

    // Load content from disk
    get().loadContent(path);
  },

  close: (path: string) => {
    const { openDocumentIds, activeDocumentId, dirtyDocumentIds } = get();
    const next = new Set(dirtyDocumentIds);
    next.delete(path);
    const remaining = openDocumentIds.filter((p) => p !== path);
    const nextActive =
      activeDocumentId === path
        ? remaining[remaining.length - 1] ?? null
        : activeDocumentId;
    set({
      openDocumentIds: remaining,
      activeDocumentId: nextActive,
      dirtyDocumentIds: next,
      editorVisible: remaining.length > 0,
      currentContent: null,
      originalContent: null,
      dirty: false,
      saving: false,
      saveError: null,
    });
  },

  setActive: (path: string) => {
    if (get().openDocumentIds.includes(path)) {
      set({ activeDocumentId: path });
    }
  },

  show: () => set({ editorVisible: true }),
  hide: () => set({ editorVisible: false }),

  // ── M12: Content + Save ──

  loadContent: async (path: string) => {
    const result = await documentBridge<{
      path: string; content: string; name: string; size: number; language?: string; modifiedAt?: number;
    }>("editor.open", { path });

    if (result.success) {
      const { content, name, size, language, modifiedAt } = result.payload;
      // Update DocumentStore metadata
      const docStore = useDocumentStore.getState();
      docStore.upsert({ path, name, content, size, modifiedAt, language });
      // Update EditorStore content state
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

  setContent: (content: string) => {
    const { originalContent } = get();
    set({
      currentContent: content,
      dirty: content !== originalContent,
    });
  },

  save: async () => {
    const { activeDocumentId, currentContent, saving } = get();
    if (!activeDocumentId || currentContent === null || saving) return;

    set({ saving: true, saveError: null });

    const result = await documentBridge<{ path: string; size: number; savedAt: number }>(
      "editor.save",
      { path: activeDocumentId, content: currentContent },
    );

    if (result.success) {
      // Update dirtyDocumentIds
      const next = new Set(get().dirtyDocumentIds);
      next.delete(activeDocumentId);
      set({
        originalContent: currentContent,
        dirty: false,
        saving: false,
        dirtyDocumentIds: next,
        saveError: null,
      });
    } else {
      set({
        saving: false,
        saveError: result.error ?? "Save failed",
      });
    }
  },

  resetContent: () => {
    set({
      currentContent: null,
      originalContent: null,
      dirty: false,
      saving: false,
      saveError: null,
      diffResult: null,
      diffVisible: false,
      diffError: null,
      processingHunks: new Set(),
    });
  },

  // ── Sprint 5: Diff + Accept/Reject + Patch ──

  diff: async () => {
    const { activeDocumentId, currentContent } = get();
    if (!activeDocumentId || currentContent === null) return;

    set({ diffError: null });

    const result = await documentBridge<{ path: string; hunks: DiffHunk[] }>(
      "editor.diff",
      { path: activeDocumentId, content: currentContent },
    );

    if (result.success) {
      const diffResult: DiffResult = {
        path: result.payload.path,
        hunks: result.payload.hunks,
      };
      set({ diffResult, diffVisible: true, diffError: null });
    } else {
      set({ diffError: result.error ?? "Failed to compute diff" });
    }
  },

  hideDiff: () => {
    set({ diffVisible: false });
  },

  acceptHunk: (hunkIndex: number) => {
    const { diffResult, currentContent, processingHunks } = get();
    if (!diffResult || !currentContent) return;

    const hunk = diffResult.hunks[hunkIndex];
    if (!hunk) return;

    // Mark this hunk as processing
    const next = new Set(processingHunks);
    next.add(hunkIndex);
    set({ processingHunks: next });

    const newContent = applyHunk(currentContent, hunk, "accept");

    // Recompute diff for remaining hunks
    const remainingHunks = [...diffResult.hunks];
    remainingHunks.splice(hunkIndex, 1);

    const removed = new Set(get().processingHunks);
    removed.delete(hunkIndex);

    set({
      currentContent: newContent,
      diffResult: {
        path: diffResult.path,
        hunks: remainingHunks,
      },
      processingHunks: removed,
      dirty: newContent !== get().originalContent,
    });
  },

  rejectHunk: (hunkIndex: number) => {
    const { diffResult, currentContent, processingHunks } = get();
    if (!diffResult || !currentContent) return;

    const hunk = diffResult.hunks[hunkIndex];
    if (!hunk) return;

    const next = new Set(processingHunks);
    next.add(hunkIndex);
    set({ processingHunks: next });

    const newContent = applyHunk(currentContent, hunk, "reject");

    const remainingHunks = [...diffResult.hunks];
    remainingHunks.splice(hunkIndex, 1);

    const removed = new Set(get().processingHunks);
    removed.delete(hunkIndex);

    set({
      currentContent: newContent,
      diffResult: {
        path: diffResult.path,
        hunks: remainingHunks,
      },
      processingHunks: removed,
      dirty: newContent !== get().originalContent,
    });
  },

  acceptAll: () => {
    const { diffResult, currentContent } = get();
    if (!diffResult || !currentContent) return;

    let content = currentContent;
    for (const hunk of diffResult.hunks) {
      content = applyHunk(content, hunk, "accept");
    }

    set({
      currentContent: content,
      diffResult: { path: diffResult.path, hunks: [] },
      diffVisible: false,
      dirty: content !== get().originalContent,
    });
  },

  rejectAll: () => {
    const { originalContent, diffResult } = get();
    if (!diffResult) return;

    set({
      currentContent: originalContent,
      diffResult: { path: diffResult.path, hunks: [] },
      diffVisible: false,
      dirty: false,
    });
  },

  applyPatch: async (patch: string) => {
    const { activeDocumentId, currentContent } = get();
    if (!activeDocumentId || currentContent === null) return;

    const result = await documentBridge<{ path: string; content: string }>(
      "editor.apply-patch",
      { path: activeDocumentId, content: currentContent, patch },
    );

    if (result.success) {
      set({
        currentContent: result.payload.content,
        dirty: result.payload.content !== get().originalContent,
        diffVisible: false,
        diffResult: null,
      });
    } else {
      set({ saveError: result.error ?? "Failed to apply patch" });
    }
  },
}));

// ============================================================
// Pure helper — apply a hunk's changes to a content string.
//
// "accept": apply added lines, remove removed lines
// "reject": remove added lines, keep removed lines (restore original)
// ============================================================

function applyHunk(
  content: string,
  hunk: DiffHunk,
  action: "accept" | "reject",
): string {
  const lines = content.split("\n");

  // Build new content by iterating through the hunk lines
  const result: string[] = [];

  // Lines before the hunk (oldStart is 1-indexed, including context)
  // Find the first non-context unchanged line to determine the actual change start
  let firstChangeInOld = -1;
  for (const line of hunk.lines) {
    if (line.type !== "unchanged" && line.oldLineNumber > 0) {
      firstChangeInOld = line.oldLineNumber;
      break;
    }
  }

  // If all changes are purely additions (no removed lines), find change start differently
  if (firstChangeInOld === -1) {
    for (const line of hunk.lines) {
      if (line.type !== "unchanged") {
        // Insertion point: before the line where we'd insert
        // Use oldStart as reference
        firstChangeInOld = hunk.oldStart;
        break;
      }
    }
  }

  if (firstChangeInOld === -1) return content;

  // Copy lines before the change (oldStart is 1-indexed line of first context line)
  // Actually, the hunk lines contain context before changes too.
  // Better approach: iterate hunk lines and construct output based on action.

  // Find the first unchanged line before any changes to anchor
  let anchorOldLine = -1;
  for (const line of hunk.lines) {
    if (line.type === "unchanged") {
      anchorOldLine = line.oldLineNumber;
    } else {
      break;
    }
  }

  // Reconstruct: copy all lines before the anchor, then process hunk, then copy rest
  const anchorIdx = anchorOldLine > 0 ? anchorOldLine - 1 : 0;

  // Copy lines before hunk
  for (let i = 0; i < anchorIdx && i < lines.length; i++) {
    result.push(lines[i]!);
  }

  // Process hunk lines
  for (const line of hunk.lines) {
    if (line.type === "unchanged") {
      result.push(line.content);
    } else if (line.type === "added") {
      if (action === "accept") {
        result.push(line.content);
      }
      // Reject: skip added lines
    } else if (line.type === "removed") {
      if (action === "reject") {
        result.push(line.content);
      }
      // Accept: skip removed lines
    }
  }

  // Find what comes after the hunk in the original
  let lastOldLine = -1;
  for (let i = hunk.lines.length - 1; i >= 0; i--) {
    const line = hunk.lines[i]!;
    if (line.oldLineNumber > 0 && line.type !== "added") {
      lastOldLine = line.oldLineNumber;
      break;
    }
  }

  if (lastOldLine > 0) {
    for (let i = lastOldLine; i < lines.length; i++) {
      result.push(lines[i]!);
    }
  }

  return result.join("\n");
}
