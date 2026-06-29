// ============================================================
// WorkspaceExplorer — read-only collapsible file tree.
// ============================================================

import { useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useTranslation } from "@/i18n/useTranslation";
import { WorkspaceTreeNode } from "./WorkspaceTreeNode";

export function WorkspaceExplorer() {
  const { t } = useTranslation();
  const nodes = useWorkspaceStore((s) => s.nodes);
  const loading = useWorkspaceStore((s) => s.loading);
  const error = useWorkspaceStore((s) => s.error);
  const refresh = useWorkspaceStore((s) => s.refresh);

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="border-t border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {t.sidebar.workspace}
        </span>
        <button
          onClick={refresh}
          className="text-gray-600 hover:text-gray-400 text-xs"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-64">
        {loading && nodes.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-600">
            <div className="h-3 bg-gray-800 rounded w-3/4 mb-1 animate-pulse" />
            <div className="h-3 bg-gray-800 rounded w-1/2 mb-1 animate-pulse" />
            <div className="h-3 bg-gray-800 rounded w-2/3 animate-pulse" />
          </div>
        ) : error && nodes.length === 0 ? (
          <div className="px-3 py-2">
            <p className="text-xs text-yellow-400">Failed to load</p>
            <button
              onClick={refresh}
              className="text-xs text-blue-400 hover:underline mt-1"
            >
              Retry
            </button>
          </div>
        ) : nodes.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-600">
            This workspace is empty.
          </div>
        ) : (
          nodes.map((node) => (
            <WorkspaceTreeNode key={node.path} node={node} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
