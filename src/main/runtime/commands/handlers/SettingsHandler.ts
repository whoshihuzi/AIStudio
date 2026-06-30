// ============================================================
// SettingsHandler — stub handler for settings commands.
//
// Handles: settings.language
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";

export class SettingsHandler implements CommandHandler {
  async execute(_context: CommandContext): Promise<CommandResult> {
    return {
      success: false,
      commandId: "",
      error: "Not implemented",
    };
  }
}
