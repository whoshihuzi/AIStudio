// ============================================================
// WorkspaceRootProvider — single source of truth for the
// workspace root directory. No other module may call
// process.cwd() or resolve paths independently.
// ============================================================

export class WorkspaceRootProvider {
  private readonly root: string;

  constructor(root?: string) {
    this.root = root ?? process.cwd();
  }

  /** Absolute path to the workspace root. Read-only. */
  getRoot(): string {
    return this.root;
  }

  /**
   * Verify a resolved absolute path stays within the workspace.
   * Throws if the path escapes the root.
   */
  guard(absPath: string): void {
    const normalized = absPath.replace(/\\/g, "/");
    const rootNorm = this.root.replace(/\\/g, "/");
    if (!normalized.startsWith(rootNorm)) {
      throw new Error(
        `Path escapes workspace root. Root: ${this.root}, Path: ${absPath}`,
      );
    }
  }
}
