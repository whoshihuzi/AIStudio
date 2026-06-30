// ============================================================
// CommandHandler — interface for command execution logic.
//
// A handler owns the business logic for a single command or
// a group of related commands. It is registered with the
// CommandExecutor by command ID.
//
// Handlers never know about the Registry, UI, or IPC.
// ============================================================

import type { CommandContext, CommandResult } from "../../../shared/command/types.js";

export interface CommandHandler {
  /**
   * Execute the handler's business logic.
   *
   * The handler is responsible for filling in `commandId` on the
   * returned result when it knows its own identity. When multiple
   * command IDs share the same handler, the Executor overwrites
   * `commandId` after execution to ensure accuracy.
   */
  execute(context: CommandContext): Promise<CommandResult>;
}
