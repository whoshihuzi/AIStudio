// ============================================================
// DashboardHandler — orchestrates dashboard commands.
//
// Handles: dashboard.open, dashboard.refresh
//
// M12.6.6: dashboard.refresh now returns a single projectState
// object instead of { data, projectInfo, brainData }.
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";
import { dashboardService } from "../../../dashboard/DashboardService.js";
import type { WorkspaceIndexStore } from "../../../workspace/WorkspaceIndexStore.js";

export class DashboardHandler implements CommandHandler {
  constructor(private readonly indexStore?: WorkspaceIndexStore) {}

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
  // dashboard.refresh — returns single ProjectState
  // ----------------------------------------------------------

  private async refresh(): Promise<CommandResult> {
    try {
      // Lazy-rebuild workspace index on first dashboard refresh (M12.6 IA fix)
      if (this.indexStore && !this.indexStore.getStats()) {
        this.indexStore.rebuild();
      }
      const indexStats = this.indexStore?.getStats() ?? null;
      const projectState = await dashboardService.getProjectState(indexStats);

      return {
        success: true,
        commandId: "dashboard.refresh",
        payload: { projectState },
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
