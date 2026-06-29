// ============================================================
// WorkspaceMapper — the ONLY place that converts internal
// Provider types (FileStat, DirectoryEntry, FileContent)
// into shared Resource Model types (FileNode, DirectoryNode).
// ============================================================

import type { FileStat, DirectoryEntry, FileContent } from "./types.js";
import type { FileNode, DirectoryNode, WorkspaceNode } from "../../shared/workspace/types.js";

export class WorkspaceMapper {
  /** Convert a FileStat into a FileNode. */
  fileStatToNode(stat: FileStat): FileNode {
    return {
      id: stat.path,
      name: stat.path.split("/").pop() ?? stat.path,
      path: stat.path,
      type: "file",
      language: this.inferLanguage(stat.path),
      size: stat.size,
      modifiedAt: stat.modifiedAt,
    };
  }

  /** Convert a DirectoryEntry into a WorkspaceNode. */
  entryToNode(entry: DirectoryEntry): WorkspaceNode {
    if (entry.isDirectory) {
      const node: DirectoryNode = {
        id: entry.path,
        name: entry.name,
        path: entry.path,
        type: "directory",
      };
      return node;
    }
    return {
      id: entry.path,
      name: entry.name,
      path: entry.path,
      type: "file",
    };
  }

  /** Convert FileContent (full read result) into FileNode. */
  fileContentToNode(fc: FileContent): FileNode {
    return {
      id: fc.path,
      name: fc.path.split("/").pop() ?? fc.path,
      path: fc.path,
      type: "file",
      language: fc.language,
      size: fc.stat.size,
      modifiedAt: fc.stat.modifiedAt,
    };
  }

  // ----------------------------------------------------------
  // Internal
  // ----------------------------------------------------------

  private inferLanguage(relPath: string): string | undefined {
    const ext = relPath.split(".").pop()?.toLowerCase();
    if (!ext) return undefined;
    const map: Record<string, string> = {
      ts: "typescript", tsx: "typescript", js: "javascript",
      json: "json", md: "markdown", css: "css",
      html: "html", py: "python", rs: "rust",
    };
    return map[ext];
  }
}
