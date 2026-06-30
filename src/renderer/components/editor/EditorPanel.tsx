// ============================================================
// EditorPanel — the editor surface.
// EmptyEditor when no file, Toolbar + placeholder when file open.
// ============================================================

import { useEditorStore } from "@/stores/editor";
import { EditorToolbar } from "./EditorToolbar";
import { EmptyEditor } from "./EmptyEditor";

export function EditorPanel() {
  const activeFile = useEditorStore((s) => s.activeFile);

  return (
    <div className="flex-1 flex flex-col bg-gray-900 border-l border-gray-700 min-w-0">
      {activeFile ? (
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
