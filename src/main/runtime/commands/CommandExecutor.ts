// ============================================================
// CommandExecutor — handler-based command dispatch.
//
// The Executor maps command IDs to handlers and dispatches
// execution requests. It owns NO business logic.
//
// Flow:
//   Registry.get(id) → Executor.findHandler(id) → handler.execute(args) → CommandResult
//
// Rules:
//   - No switch(command.id)
//   - No if(command.id)
//   - No command-specific logic inside Executor
//   - No UI, no Renderer, no IPC, no keyboard, no Palette
// ============================================================

import type {
  CommandContext,
  CommandResult,
} from "../../../shared/command/types.js";
import type { CommandHandler } from "./CommandHandler.js";
import type { CommandRegistry } from "./CommandRegistry.js";

// ----------------------------------------------------------
// Errors
// ----------------------------------------------------------

export class CommandExecutorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandExecutorError";
  }
}

// ----------------------------------------------------------
// CommandExecutor
// ----------------------------------------------------------

export class CommandExecutor {
  private readonly handlers = new Map<string, CommandHandler>();

  constructor(private readonly registry: CommandRegistry) {}

  // ----------------------------------------------------------
  // Handler management
  // ----------------------------------------------------------

  /**
   * Register a handler for a command ID.
   *
   * @throws {CommandExecutorError} if commandId is empty or handler is null/undefined.
   */
  registerHandler(commandId: string, handler: CommandHandler): void {
    if (!commandId || commandId.trim().length === 0) {
      throw new CommandExecutorError("Command ID must not be empty.");
    }
    if (!handler) {
      throw new CommandExecutorError(
        `Handler for "${commandId}" must not be null or undefined.`,
      );
    }
    this.handlers.set(commandId, handler);
  }

  /** Remove a handler by command ID. No-op if not found. */
  unregisterHandler(commandId: string): void {
    this.handlers.delete(commandId);
  }

  /** Check whether a handler is registered for this command ID. */
  hasHandler(commandId: string): boolean {
    return this.handlers.has(commandId);
  }

  /** List all command IDs that have registered handlers. */
  listHandlers(): string[] {
    return [...this.handlers.keys()];
  }

  // ----------------------------------------------------------
  // Execution
  // ----------------------------------------------------------

  /**
   * Execute a command by ID.
   *
   * 1. Look up command definition in the Registry.
   * 2. Find the registered handler.
   * 3. Check whether the command is enabled in the given context.
   * 4. Dispatch to handler.execute(context).
   *
   * Returns a descriptive CommandResult on every error path.
   * Never throws — all errors are captured into the result.
   */
  async execute(
    commandId: string,
    context: CommandContext,
  ): Promise<CommandResult> {
    // ── Step 1: Look up in Registry ──
    const definition = this.registry.get(commandId);
    if (!definition) {
      return {
        success: false,
        commandId,
        error: `Unknown command: ${commandId}`,
      };
    }

    // ── Step 2: Find handler ──
    const handler = this.handlers.get(commandId);
    if (!handler) {
      return {
        success: false,
        commandId,
        error: `No handler registered for command: ${commandId}`,
      };
    }

    // ── Step 3: Check enabled ──
    if (!definition.enabled(context)) {
      return {
        success: false,
        commandId,
        error: `Command is disabled in current context: ${commandId}`,
      };
    }

    // ── Step 4: Dispatch to handler ──
    try {
      const result = await handler.execute(context, commandId);
      // Ensure commandId is always correct, even if the handler
      // doesn't set it or sets it to a different value.
      return { ...result, commandId };
    } catch (error) {
      return {
        success: false,
        commandId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
