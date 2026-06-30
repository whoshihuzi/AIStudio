// ============================================================
// PreviewHandler — orchestrates preview commands.
//
// Handles: preview.close
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";

export class PreviewHandler implements CommandHandler {
  async execute(_context: CommandContext, commandId: string): Promise<CommandResult> {
    switch (commandId) {
      case "preview.close":
        // preview.close is a pure UI state change.
        // The handler returns success; the renderer reacts by
        // clearing its own WorkspacePreviewStore state.
        return { success: true, commandId };
      default:
        return { success: false, commandId, error: `PreviewHandler: unknown command "${commandId}"` };
    }
  }
}
