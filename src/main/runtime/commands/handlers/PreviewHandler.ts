// ============================================================
// PreviewHandler — stub handler for preview commands.
//
// Handles: preview.close
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";

export class PreviewHandler implements CommandHandler {
  async execute(_context: CommandContext): Promise<CommandResult> {
    return {
      success: false,
      commandId: "",
      error: "Not implemented",
    };
  }
}
