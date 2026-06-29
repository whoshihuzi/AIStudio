// ============================================================
// ProjectInfoProvider — composes GitProvider + config metadata.
// Does NOT duplicate GitProvider — delegates Git queries to it.
// ============================================================

import { GitProvider } from "./GitProvider.js";
import * as configStore from "../config-store.js";
import type { ProjectInfo } from "./types.js";

export class ProjectInfoProvider {
  private readonly git = new GitProvider();

  // ----------------------------------------------------------
  // Get full project identity
  // ----------------------------------------------------------

  getProjectInfo(): ProjectInfo {
    const workspacePath = process.cwd();
    const projectName = this.resolveProjectName(workspacePath);

    return {
      projectName,
      workspacePath,
      branch: this.git.getBranch(),
      latestTag: this.git.getBaseline().tag,
      headCommit: this.git.getHeadCommit(),
      isClean: this.git.getWorkingTree().isClean,
    };
  }

  // ----------------------------------------------------------
  // Ensure metadata exists in config (first-run bootstrap)
  // ----------------------------------------------------------

  ensureMetadata(): void {
    if (!configStore.getConfig("projectName")) {
      configStore.setConfig("projectName", this.resolveProjectName(process.cwd()));
    }
    if (!configStore.getConfig("workspacePath")) {
      configStore.setConfig("workspacePath", process.cwd());
    }
    if (!configStore.getConfig("createdAt")) {
      configStore.setConfig("createdAt", Date.now());
    }
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private resolveProjectName(cwd: string): string {
    // Check config override first
    const saved = configStore.getConfig("projectName") as string | undefined;
    if (saved) return saved;

    // Fall back to directory name
    const parts = cwd.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] ?? "AI Studio";
  }
}
