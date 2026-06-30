// ============================================================
// WorkspacePreviewStore — selected file preview state.
// Never knows absolute paths. Uses workspace:read IPC.
// ============================================================

import { create } from "zustand";

export interface PreviewFile {
  path: string;
  name: string;
  content: string;
  size: number;
  modifiedAt: number;
}

export interface WorkspacePreviewState {
  file: PreviewFile | null;
  visible: boolean;
  loading: boolean;
  error: string | null;

  open: (path: string) => Promise<void>;
  close: () => void;
  refresh: () => Promise<void>;
}

export const useWorkspacePreviewStore = create<WorkspacePreviewState>((set, get) => ({
  file: null,
  visible: false,
  loading: false,
  error: null,

  open: async (path: string) => {
    set({ loading: true, error: null, visible: true, file: null });
    try {
      const raw = await window.api.workspace.read(path);
      const data = raw as { node: { path: string; name: string; size: number; modifiedAt: number }; content: string };
      set({
        file: {
          path: data.node.path,
          name: data.node.name,
          content: data.content,
          size: data.node.size,
          modifiedAt: data.node.modifiedAt,
        },
        loading: false,
      });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  close: () => set({ file: null, visible: false, error: null }),

  refresh: async () => {
    const { file } = get();
    if (file) await get().open(file.path);
  },
}));
