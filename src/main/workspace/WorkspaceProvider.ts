// ============================================================
// WorkspaceProvider — M9.5 refactored.
// Internal methods return Provider types. Shared-model methods
// (listNodes, statNode, readFileNode) return Resource Model
// types via WorkspaceMapper.
// ============================================================

import { readFileSync, readdirSync, statSync, existsSync, type Stats } from "fs";
import { WorkspaceRootProvider } from "./WorkspaceRootProvider.js";
import { PathResolver } from "./PathResolver.js";
import { WorkspaceMapper } from "./WorkspaceMapper.js";
import type {
  IWorkspaceProvider, FileContent, FileStat,
  DirectoryEntry, SearchResult, GlobResult, SearchOptions,
} from "./types.js";
import type { WorkspaceNode, FileNode } from "../../shared/workspace/types.js";

export class WorkspaceProvider implements IWorkspaceProvider {
  private readonly mapper = new WorkspaceMapper();

  constructor(
    private readonly root: WorkspaceRootProvider,
    private readonly paths: PathResolver,
  ) {}

  // ----------------------------------------------------------
  // Internal (Provider types)
  // ----------------------------------------------------------

  readFile(relPath: string): FileContent {
    const abs = this.paths.resolveWorkspacePath(relPath);
    const s = statSync(abs);
    const content = readFileSync(abs, "utf-8");
    return {
      path: relPath, content,
      stat: this.toStat(relPath, abs, s),
      language: this.inferLanguage(relPath),
    };
  }

  exists(relPath: string): boolean {
    return existsSync(this.paths.resolveWorkspacePath(relPath));
  }

  stat(relPath: string): FileStat {
    return this.toStat(relPath, this.paths.resolveWorkspacePath(relPath), statSync(this.paths.resolveWorkspacePath(relPath)));
  }

  listDirectory(relPath: string): DirectoryEntry[] {
    const abs = this.paths.resolveWorkspacePath(relPath);
    return readdirSync(abs).map((name): DirectoryEntry => {
      const childAbs = this.paths.resolveRelative(abs, name);
      const childRel = relPath ? `${relPath}/${name}` : name;
      const s = statSync(childAbs);
      return { name, path: childRel, isDirectory: s.isDirectory(), isFile: s.isFile() };
    });
  }

  // ----------------------------------------------------------
  // Shared Resource Model methods
  // ----------------------------------------------------------

  listNodes(relPath: string): WorkspaceNode[] {
    return this.listDirectory(relPath).map((e) => this.mapper.entryToNode(e));
  }

  statNode(relPath: string): FileNode {
    const st = this.stat(relPath);
    if (!st.isFile) throw new Error(`Not a file: ${relPath}`);
    return this.mapper.fileStatToNode(st);
  }

  readFileNode(relPath: string): { node: FileNode; content: string } {
    const fc = this.readFile(relPath);
    return { node: this.mapper.fileContentToNode(fc), content: fc.content };
  }

  // ----------------------------------------------------------
  // Stubs
  // ----------------------------------------------------------

  writeFile(_path: string, _content: string): void {
    throw new Error("WorkspaceProvider.writeFile: not implemented");
  }

  glob(_pattern: string): GlobResult {
    throw new Error("WorkspaceProvider.glob: not implemented");
  }

  searchText(_query: string, _options?: SearchOptions): SearchResult {
    throw new Error("WorkspaceProvider.searchText: not implemented");
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private toStat(relPath: string, absPath: string, s: Stats): FileStat {
    return {
      path: relPath, absolutePath: absPath,
      isDirectory: s.isDirectory(), isFile: s.isFile(),
      size: Number(s.size), modifiedAt: Number(s.mtimeMs), createdAt: Number(s.birthtimeMs),
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
