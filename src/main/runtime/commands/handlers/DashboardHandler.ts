// ============================================================
// DashboardHandler — stub handler for dashboard commands.
//
// Handles: dashboard.open, dashboard.refresh
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";

export class DashboardHandler implements CommandHandler {
  async execute(_context: CommandContext): Promise<CommandResult> {
    return {
      success: false,
      commandId: "",
      error: "Not implemented",
    };
  }
}
