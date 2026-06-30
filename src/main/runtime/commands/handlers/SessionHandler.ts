// ============================================================
// SessionHandler — stub handler for session commands.
//
// Handles: session.open, session.new
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";

export class SessionHandler implements CommandHandler {
  async execute(_context: CommandContext): Promise<CommandResult> {
    return {
      success: false,
      commandId: "",
      error: "Not implemented",
    };
  }
}
