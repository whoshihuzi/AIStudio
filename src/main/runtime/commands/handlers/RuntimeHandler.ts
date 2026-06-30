// ============================================================
// RuntimeHandler — orchestrates runtime commands.
//
// Handles: runtime.runChecks
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";
import { dashboardService } from "../../../dashboard/DashboardService.js";

export class RuntimeHandler implements CommandHandler {
  async execute(_context: CommandContext, commandId: string): Promise<CommandResult> {
    switch (commandId) {
      case "runtime.runChecks":
        return this.runChecks();
      default:
        return { success: false, commandId, error: `RuntimeHandler: unknown command "${commandId}"` };
    }
  }

  // ----------------------------------------------------------
  // runtime.runChecks — run typecheck + build
  // ----------------------------------------------------------

  private async runChecks(): Promise<CommandResult> {
    try {
      const status = await dashboardService.runChecks();
      return {
        success: true,
        commandId: "runtime.runChecks",
        payload: { typecheck: status.typecheck, build: status.build },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "runtime.runChecks",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
