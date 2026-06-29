// ============================================================
// WorkspaceProvider — M9a skeleton.
// read/exists/stat/list are working. All others are stubs.
// ============================================================

import { readFileSync, readdirSync, statSync, existsSync, type Stats } from "fs";
import { join, resolve } from "path";
import type {
  IWorkspaceProvider, FileContent, FileStat,
  DirectoryEntry, SearchResult, GlobResult, SearchOptions,
} from "./types.js";

const ROOT = process.cwd();

export class WorkspaceProvider implements IWorkspaceProvider {
  // ----------------------------------------------------------
  // Working implementations
  // ----------------------------------------------------------

  readFile(relPath: string): FileContent {
    const abs = this.safeResolve(relPath);
    const s = statSync(abs);
    const content = readFileSync(abs, "utf-8");
    return {
      path: relPath,
      content,
      stat: this.toStat(relPath, s),
      language: this.inferLanguage(relPath),
    };
  }

  exists(relPath: string): boolean {
    return existsSync(this.safeResolve(relPath));
  }

  stat(relPath: string): FileStat {
    const abs = this.safeResolve(relPath);
    return this.toStat(relPath, statSync(abs));
  }

  listDirectory(relPath: string): DirectoryEntry[] {
    const abs = this.safeResolve(relPath);
    const names = readdirSync(abs);
    return names.map((name): DirectoryEntry => {
      const childAbs = join(abs, name);
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
  // Stubs (M9a — will be implemented in later milestones)
  // ----------------------------------------------------------

  writeFile(_path: string, _content: string): void {
    throw new Error("WorkspaceProvider.writeFile: not implemented in M9a");
  }

  glob(_pattern: string): GlobResult {
    throw new Error("WorkspaceProvider.glob: not implemented in M9a");
  }

  searchText(_query: string, _options?: SearchOptions): SearchResult {
    throw new Error("WorkspaceProvider.searchText: not implemented in M9a");
  }

  // ----------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------

  private safeResolve(relPath: string): string {
    const abs = resolve(ROOT, relPath);
    if (!abs.startsWith(ROOT)) {
      throw new Error(`Path traversal denied: ${relPath}`);
    }
    return abs;
  }

  private toStat(relPath: string, s: Stats): FileStat {
    return {
      path: relPath,
      absolutePath: resolve(ROOT, relPath),
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
