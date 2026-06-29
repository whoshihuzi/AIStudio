// ============================================================
// PreviewPanel — read-only file preview.
// ============================================================

import { useWorkspacePreviewStore } from "@/stores/workspace-preview";
import { LoadingState, ErrorState } from "./ui/base";

export function PreviewPanel() {
  const file = useWorkspacePreviewStore((s) => s.file);
  const loading = useWorkspacePreviewStore((s) => s.loading);
  const error = useWorkspacePreviewStore((s) => s.error);
  const close = useWorkspacePreviewStore((s) => s.close);
  const refresh = useWorkspacePreviewStore((s) => s.refresh);

  if (!file && !loading && !error) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-gray-600">
        Select a file from Workspace Explorer to preview.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 border-l border-gray-700 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-850 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {file && (
            <>
              <span className="text-sm text-gray-300 font-medium truncate">{file.name}</span>
              <span className="text-xs text-gray-600 font-mono hidden sm:inline truncate">{file.path}</span>
              <span className="text-xs text-gray-700 shrink-0">{formatSize(file.size)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {file && (
            <button onClick={refresh} className="text-xs text-gray-500 hover:text-gray-300">
              ↻
            </button>
          )}
          <button onClick={close} className="text-xs text-gray-500 hover:text-gray-300">
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4"><LoadingState lines={8} /></div>
        ) : error ? (
          <div className="p-4"><ErrorState message="Cannot read file." onRetry={refresh} /></div>
        ) : file ? (
          <>
            <div className="px-4 py-2 text-xs text-gray-600 border-b border-gray-800">
              Modified {formatDate(file.modifiedAt)}
            </div>
            <pre className="p-4 text-xs text-gray-300 font-mono whitespace-pre overflow-x-auto leading-relaxed">
              {file.content}
            </pre>
          </>
        ) : null}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days} days ago`;
}
