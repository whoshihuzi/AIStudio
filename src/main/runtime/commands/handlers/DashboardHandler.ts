// ============================================================
// DashboardHandler — orchestrates dashboard commands.
//
// Handles: dashboard.open, dashboard.refresh
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";
import { dashboardService } from "../../../dashboard/DashboardService.js";

export class DashboardHandler implements CommandHandler {
  async execute(_context: CommandContext, commandId: string): Promise<CommandResult> {
    switch (commandId) {
      case "dashboard.refresh":
        return this.refresh();
      case "dashboard.open":
        return { success: true, commandId, payload: { action: "navigate", view: "dashboard" } };
      default:
        return { success: false, commandId, error: `DashboardHandler: unknown command "${commandId}"` };
    }
  }

  // ----------------------------------------------------------
  // dashboard.refresh — reload all Dashboard data
  // ----------------------------------------------------------

  private async refresh(): Promise<CommandResult> {
    try {
      const [data, projectInfo, brainData] = await Promise.all([
        dashboardService.getData(),
        Promise.resolve(dashboardService.getProjectInfo()),
        Promise.resolve(dashboardService.getBrainData()),
      ]);

      return {
        success: true,
        commandId: "dashboard.refresh",
        payload: { data, projectInfo, brainData },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "dashboard.refresh",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
