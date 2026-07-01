// ============================================================
// WorkspacePreviewStore — selected file preview state.
// References Documents by path only. Content lives in DocumentStore.
// Opens files through the Command system (workspace.openFile).
// Never knows absolute paths. Never calls workspace:read IPC directly.
// ============================================================

import { create } from "zustand";
import { useDocumentStore } from "@/stores/document";
import type { CommandResult } from "@shared/command/types";

export interface WorkspacePreviewState {
  /** Path of the currently previewed document, if any. */
  activeDocumentId: string | null;
  /** Whether the preview panel is visible. */
  previewVisible: boolean;
  loading: boolean;
  error: string | null;

  /** Load document content via Command system and open preview. */
  open: (path: string) => Promise<void>;
  close: () => void;
  refresh: () => Promise<void>;
}

export const useWorkspacePreviewStore = create<WorkspacePreviewState>((set, get) => ({
  activeDocumentId: null,
  previewVisible: false,
  loading: false,
  error: null,

  open: async (path: string) => {
    set({ loading: true, error: null, previewVisible: true, activeDocumentId: path });

    try {
      const raw = await window.api.command.execute("workspace.openFile", {
        selectedFile: path,
      });
      const result = raw as CommandResult;

      if (!result.success) {
        throw new Error(result.error ?? "Failed to open file");
      }

      const payload = result.payload as {
        node: { path: string; name: string; size: number; modifiedAt: number };
        content: string;
      };

      // Upsert full metadata + content into DocumentStore
      useDocumentStore.getState().upsert({
        path: payload.node.path,
        name: payload.node.name,
        content: payload.content,
        size: payload.node.size,
        modifiedAt: payload.node.modifiedAt,
      });

      set({ loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  close: () => set({ activeDocumentId: null, previewVisible: false, error: null }),

  refresh: async () => {
    const { activeDocumentId } = get();
    if (activeDocumentId) await get().open(activeDocumentId);
  },
}));
