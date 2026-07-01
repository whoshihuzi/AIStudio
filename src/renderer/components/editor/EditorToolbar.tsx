// ============================================================
// EditorToolbar — file name, close, save.
// M12: wired Save button with dirty indicator and saving state.
// Reads document name from DocumentStore, IDs from EditorStore.
// ============================================================

import { useEditorStore } from "@/stores/editor";
import { useDocumentStore } from "@/stores/document";

export function EditorToolbar() {
  const activeDocumentId = useEditorStore((s) => s.activeDocumentId);
  const dirty = useEditorStore((s) => s.dirty);
  const saving = useEditorStore((s) => s.saving);
  const diffVisible = useEditorStore((s) => s.diffVisible);
  const diffResult = useEditorStore((s) => s.diffResult);
  const save = useEditorStore((s) => s.save);
  const diff = useEditorStore((s) => s.diff);
  const hideDiff = useEditorStore((s) => s.hideDiff);
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
        {/* Diff / Edit toggle */}
        {diffVisible ? (
          <button
            onClick={hideDiff}
            className="text-xs px-2 py-1 text-cyan-400 hover:text-cyan-300 hover:bg-gray-800 rounded"
            title="Return to editor"
          >
            Edit
          </button>
        ) : (
          <button
            onClick={diff}
            disabled={!dirty && !diffResult}
            className={`text-xs px-2 py-1 rounded ${
              dirty
                ? "text-cyan-400 hover:text-cyan-300 hover:bg-gray-800"
                : "text-gray-700 cursor-not-allowed"
            }`}
            title={dirty ? "Show diff" : "No changes to diff"}
          >
            Diff
          </button>
        )}
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
