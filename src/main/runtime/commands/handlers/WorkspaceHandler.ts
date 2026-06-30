// ============================================================
// WorkspaceHandler — orchestrates workspace commands.
//
// Handles: workspace.openFile, workspace.refreshIndex, workspace.search
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";
import type { WorkspaceIndexStore } from "../../../workspace/WorkspaceIndexStore.js";

export class WorkspaceHandler implements CommandHandler {
  constructor(private readonly indexStore: WorkspaceIndexStore) {}

  async execute(_context: CommandContext, commandId: string): Promise<CommandResult> {
    switch (commandId) {
      case "workspace.refreshIndex":
        return this.refreshIndex();
      case "workspace.openFile":
      case "workspace.search":
        return { success: false, commandId, error: "Not implemented" };
      default:
        return { success: false, commandId, error: `WorkspaceHandler: unknown command "${commandId}"` };
    }
  }

  // ----------------------------------------------------------
  // workspace.refreshIndex — rebuild the project file index
  // ----------------------------------------------------------

  private refreshIndex(): CommandResult {
    try {
      const stats = this.indexStore.rebuild();
      return {
        success: true,
        commandId: "workspace.refreshIndex",
        payload: { stats },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "workspace.refreshIndex",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
