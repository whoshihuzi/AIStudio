// ============================================================
// WorkspaceHandler — stub handler for workspace commands.
//
// Handles: workspace.openFile, workspace.refreshIndex, workspace.search
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";

export class WorkspaceHandler implements CommandHandler {
  async execute(_context: CommandContext): Promise<CommandResult> {
    return {
      success: false,
      commandId: "",
      error: "Not implemented",
    };
  }
}
