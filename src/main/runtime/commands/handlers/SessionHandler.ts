// ============================================================
// SessionHandler — orchestrates session commands.
//
// Handles: session.open, session.new
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";
import * as sessionStore from "../../../runtime/session-store.js";
import { runtimeManager } from "../../../runtime/runtime-manager.js";

export class SessionHandler implements CommandHandler {
  async execute(context: CommandContext, commandId: string): Promise<CommandResult> {
    switch (commandId) {
      case "session.new":
        return this.newSession(context);
      case "session.open":
        return this.openSession(context);
      default:
        return { success: false, commandId, error: `SessionHandler: unknown command "${commandId}"` };
    }
  }

  // ----------------------------------------------------------
  // session.new — create a new agent conversation session
  // ----------------------------------------------------------

  private newSession(context: CommandContext): CommandResult {
    try {
      const adapter = runtimeManager.listAdapters()[0]?.id ?? "hermes";
      const meta = sessionStore.createSession(adapter);
      return {
        success: true,
        commandId: "session.new",
        payload: { session: meta },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "session.new",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ----------------------------------------------------------
  // session.open — open an existing session or list sessions
  // ----------------------------------------------------------

  private openSession(context: CommandContext): CommandResult {
    try {
      if (context.activeSessionId) {
        const session = sessionStore.loadSession(context.activeSessionId);
        if (!session) {
          return {
            success: false,
            commandId: "session.open",
            error: `Session not found: ${context.activeSessionId}`,
          };
        }
        return {
          success: true,
          commandId: "session.open",
          payload: { session: session.meta },
        };
      }

      // No sessionId specified — return list
      const sessions = sessionStore.listSessions();
      return {
        success: true,
        commandId: "session.open",
        payload: { sessions },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "session.open",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
