// ============================================================
// EditorToolbar — file name, close, save (disabled).
// No real save. No auto-save. No keyboard shortcuts.
// ============================================================

import { useEditorStore } from "@/stores/editor";

export function EditorToolbar() {
  const activeFile = useEditorStore((s) => s.activeFile);
  const close = useEditorStore((s) => s.close);

  if (!activeFile) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-850 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-gray-300 font-medium truncate">
          {activeFile.name}
        </span>
        <span className="text-xs text-gray-600 font-mono truncate hidden sm:inline">
          {activeFile.path}
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
          onClick={() => close(activeFile.path)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
