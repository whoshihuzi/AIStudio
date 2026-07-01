// ============================================================
// EditorPanel — the editor surface.
// M12: wired textarea editor with content, dirty tracking, Ctrl+S.
// Reads document metadata from DocumentStore (single source of truth).
// ============================================================

import { useEffect } from "react";
import { useEditorStore } from "@/stores/editor";
import { useDocumentStore } from "@/stores/document";
import { EditorToolbar } from "./EditorToolbar";
import { EmptyEditor } from "./EmptyEditor";
import { DiffView } from "./DiffView";

export function EditorPanel() {
  const activeDocumentId = useEditorStore((s) => s.activeDocumentId);
  const currentContent = useEditorStore((s) => s.currentContent);
  const dirty = useEditorStore((s) => s.dirty);
  const saving = useEditorStore((s) => s.saving);
  const diffVisible = useEditorStore((s) => s.diffVisible);
  const diffResult = useEditorStore((s) => s.diffResult);
  const diffError = useEditorStore((s) => s.diffError);
  const processingHunks = useEditorStore((s) => s.processingHunks);
  const setContent = useEditorStore((s) => s.setContent);
  const save = useEditorStore((s) => s.save);
  const diff = useEditorStore((s) => s.diff);
  const hideDiff = useEditorStore((s) => s.hideDiff);
  const acceptHunk = useEditorStore((s) => s.acceptHunk);
  const rejectHunk = useEditorStore((s) => s.rejectHunk);
  const acceptAll = useEditorStore((s) => s.acceptAll);
  const rejectAll = useEditorStore((s) => s.rejectAll);
  const doc = activeDocumentId
    ? useDocumentStore((s) => s.get(activeDocumentId))
    : undefined;

  // Ctrl+S / Cmd+S handler
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
          {diffVisible && diffResult ? (
            <DiffView
              diffResult={diffResult}
              interactive
              onAcceptHunk={acceptHunk}
              onRejectHunk={rejectHunk}
              onAcceptAll={acceptAll}
              onRejectAll={rejectAll}
              processingHunks={processingHunks}
            />
          ) : diffError ? (
            <div className="flex-1 flex items-center justify-center text-sm text-red-400 p-4">
              {diffError}
            </div>
          ) : (
            <textarea
              className="flex-1 bg-gray-950 text-gray-200 text-sm font-mono p-4 resize-none outline-none border-0"
              value={currentContent ?? ""}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              readOnly={saving}
            />
          )}
        </>
      ) : (
        <EmptyEditor />
      )}
    </div>
  );
}
