// ============================================================
// DocumentStore — single source of truth for all Documents.
// EditorStore and PreviewStore reference Documents by path only.
// ============================================================

import { create } from "zustand";
import type { DocumentMetadata } from "@shared/editor/types";

export interface DocumentStoreState {
  /** All known documents, keyed by path. */
  documents: Map<string, DocumentMetadata>;

  /** Insert or update a document's metadata. */
  upsert: (meta: DocumentMetadata) => void;
  /** Look up a document by path. */
  get: (path: string) => DocumentMetadata | undefined;
  /** Remove a document from the store. */
  remove: (path: string) => void;
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  documents: new Map(),

  upsert: (meta: DocumentMetadata) => {
    const next = new Map(get().documents);
    next.set(meta.path, meta);
    set({ documents: next });
  },

  get: (path: string) => {
    return get().documents.get(path);
  },

  remove: (path: string) => {
    const next = new Map(get().documents);
    next.delete(path);
    set({ documents: next });
  },
}));
