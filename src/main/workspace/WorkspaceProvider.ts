// ============================================================
// WorkspaceProvider — M9b refactored.
// No longer knows where workspace root is. All path resolution
// delegated to injected PathResolver + WorkspaceRootProvider.
// ============================================================

import { readFileSync, readdirSync, statSync, existsSync, type Stats } from "fs";
import { WorkspaceRootProvider } from "./WorkspaceRootProvider.js";
import { PathResolver } from "./PathResolver.js";
import type {
  IWorkspaceProvider, FileContent, FileStat,
  DirectoryEntry, SearchResult, GlobResult, SearchOptions,
} from "./types.js";

export class WorkspaceProvider implements IWorkspaceProvider {
  constructor(
    private readonly root: WorkspaceRootProvider,
    private readonly paths: PathResolver,
  ) {}

  // ----------------------------------------------------------
  // Working implementations
  // ----------------------------------------------------------

  readFile(relPath: string): FileContent {
    const abs = this.paths.resolveWorkspacePath(relPath);
    const s = statSync(abs);
    const content = readFileSync(abs, "utf-8");
    return {
      path: relPath,
      content,
      stat: this.toStat(relPath, abs, s),
      language: this.inferLanguage(relPath),
    };
  }

  exists(relPath: string): boolean {
    return existsSync(this.paths.resolveWorkspacePath(relPath));
  }

  stat(relPath: string): FileStat {
    const abs = this.paths.resolveWorkspacePath(relPath);
    return this.toStat(relPath, abs, statSync(abs));
  }

  listDirectory(relPath: string): DirectoryEntry[] {
    const abs = this.paths.resolveWorkspacePath(relPath);
    const names = readdirSync(abs);
    return names.map((name): DirectoryEntry => {
      const childAbs = this.paths.resolveRelative(abs, name);
      const childRel = relPath ? `${relPath}/${name}` : name;
      const s = statSync(childAbs);
      return {
        name,
        path: childRel,
        isDirectory: s.isDirectory(),
        isFile: s.isFile(),
      };
    });
  }

  // ----------------------------------------------------------
  // Stubs
  // ----------------------------------------------------------

  writeFile(_path: string, _content: string): void {
    throw new Error("WorkspaceProvider.writeFile: not implemented in M9b");
  }

  glob(_pattern: string): GlobResult {
    throw new Error("WorkspaceProvider.glob: not implemented in M9b");
  }

  searchText(_query: string, _options?: SearchOptions): SearchResult {
    throw new Error("WorkspaceProvider.searchText: not implemented in M9b");
  }

  // ----------------------------------------------------------
  // Helpers (no path logic)
  // ----------------------------------------------------------

  private toStat(relPath: string, absPath: string, s: Stats): FileStat {
    return {
      path: relPath,
      absolutePath: absPath,
      isDirectory: s.isDirectory(),
      isFile: s.isFile(),
      size: Number(s.size),
      modifiedAt: Number(s.mtimeMs),
      createdAt: Number(s.birthtimeMs),
    };
  }

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
