// ============================================================
// PathResolver — centralized, safe path resolution.
// All path operations go through this class. No direct use of
// path.join() or path.resolve() anywhere else in the codebase.
// ============================================================

import { join, resolve as pathResolve } from "path";
import { WorkspaceRootProvider } from "./WorkspaceRootProvider.js";

export class PathResolver {
  constructor(private readonly root: WorkspaceRootProvider) {}

  /** Resolve a relative path to absolute, guarded. */
  resolveWorkspacePath(relPath: string): string {
    const abs = pathResolve(this.root.getRoot(), relPath);
    this.root.guard(abs);
    return abs;
  }

  /** Resolve docs/ path (e.g. docs/09_TODO.md). */
  resolveDocsPath(relPath: string): string {
    return this.resolveWorkspacePath(join("docs", relPath));
  }

  /** Resolve workspace/brain/ path. */
  resolveBrainPath(relPath: string): string {
    return this.resolveWorkspacePath(join("workspace", "brain", relPath));
  }

  /** Resolve workspace/sessions/ path. */
  resolveSessionsPath(relPath: string): string {
    return this.resolveWorkspacePath(join("workspace", "sessions", relPath));
  }

  /** Resolve a path relative to an already-resolved absolute directory. */
  resolveRelative(parentAbs: string, child: string): string {
    const abs = pathResolve(parentAbs, child);
    this.root.guard(abs);
    return abs;
  }
}
