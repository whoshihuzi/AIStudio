// ============================================================
// EditorStore — editor UI state only.
// No save(). No writeFile(). No WorkspaceProvider. No fs ops.
// This store is purely about what the editor UI shows.
// ============================================================

import { create } from "zustand";
import type { EditorFile } from "@shared/editor/types";

export interface EditorStoreState {
  openFiles: EditorFile[];
  activeFile: EditorFile | null;
  dirtyFiles: Set<string>;
  isVisible: boolean;

  open: (file: EditorFile) => void;
  close: (path: string) => void;
  setActive: (path: string) => void;
  show: () => void;
  hide: () => void;
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  openFiles: [],
  activeFile: null,
  dirtyFiles: new Set(),
  isVisible: false,

  open: (file: EditorFile) => {
    const { openFiles } = get();
    const exists = openFiles.find((f) => f.path === file.path);
    if (exists) {
      set({ activeFile: exists, isVisible: true });
    } else {
      set({
        openFiles: [...openFiles, file],
        activeFile: file,
        isVisible: true,
      });
    }
  },

  close: (path: string) => {
    const { openFiles, activeFile, dirtyFiles } = get();
    const next = dirtyFiles;
    next.delete(path);
    const remaining = openFiles.filter((f) => f.path !== path);
    const nextActive =
      activeFile?.path === path
        ? remaining[remaining.length - 1] ?? null
        : activeFile;
    set({
      openFiles: remaining,
      activeFile: nextActive,
      dirtyFiles: next,
      isVisible: remaining.length > 0,
    });
  },

  setActive: (path: string) => {
    const file = get().openFiles.find((f) => f.path === path);
    if (file) set({ activeFile: file });
  },

  show: () => set({ isVisible: true }),
  hide: () => set({ isVisible: false }),
}));
