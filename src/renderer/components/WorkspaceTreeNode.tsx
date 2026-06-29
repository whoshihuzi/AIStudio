// ============================================================
// WorkspaceTreeNode — single row in the file tree.
// ============================================================

import { useState } from "react";
import { useWorkspaceStore } from "@/stores/workspace";

interface Props {
  node: WorkspaceNode;
  depth: number;
}

export function WorkspaceTreeNode({ node, depth }: Props) {
  const expanded = useWorkspaceStore((s) => s.expanded);
  const toggleDirectory = useWorkspaceStore((s) => s.toggleDirectory);
  const [children, setChildren] = useState<WorkspaceNode[] | null>(null);
  const [loading, setLoading] = useState(false);

  const isDir = node.type === "directory";
  const isOpen = expanded.has(node.path);

  async function handleToggle() {
    if (!isDir) return;
    toggleDirectory(node.path);
    if (!isOpen && children === null) {
      setLoading(true);
      try {
        const raw = await window.api.workspace.list(node.path);
        const list: WorkspaceNode[] = Array.isArray(raw) ? raw as WorkspaceNode[] : [];
        // Sort: directories first, then alphabetical
        const sorted = [...list].sort((a, b) => {
          if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setChildren(sorted);
      } catch {
        setChildren([]);
      }
      setLoading(false);
    }
  }

  return (
    <div>
      <div
        className="flex items-center gap-1 px-3 py-0.5 cursor-pointer text-xs
                   text-gray-400 hover:bg-gray-750 hover:text-gray-200"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={handleToggle}
      >
        <span className="w-3 text-center text-gray-600">
          {isDir ? (isOpen ? "▼" : "▶") : " "}
        </span>
        <span className="truncate">{node.name}</span>
      </div>

      {/* Children */}
      {isDir && isOpen && (
        <div>
          {loading ? (
            <div className="text-xs text-gray-600" style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}>
              Loading...
            </div>
          ) : (children ?? []).length > 0 ? (
            children!.map((child) => (
              <WorkspaceTreeNode key={child.path} node={child} depth={depth + 1} />
            ))
          ) : (
            <div className="text-xs text-gray-700" style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}>
              (empty)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
