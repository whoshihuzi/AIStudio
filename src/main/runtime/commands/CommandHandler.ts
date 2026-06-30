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
   * @param context — runtime context (current view, selected file, etc.)
   * @param commandId — the command ID being executed, supplied by the
   *   Executor so multi-command handlers can distinguish invocations.
   *
   * The Executor overwrites `commandId` on the returned result after
   * execution to ensure accuracy, so handlers may return empty `commandId`.
   */
  execute(context: CommandContext, commandId: string): Promise<CommandResult>;
}
