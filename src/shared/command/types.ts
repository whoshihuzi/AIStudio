// ============================================================
// Command System types — shared between Main and Renderer.
// No Electron imports. No Node imports. Pure interfaces.
// ============================================================

// ----------------------------------------------------------
// CommandCategory — classification
// ----------------------------------------------------------

export type CommandCategory =
  | "workspace"
  | "dashboard"
  | "session"
  | "runtime"
  | "ai"
  | "settings"
  | "navigation"
  | "plugin";

// ----------------------------------------------------------
// CommandContext — runtime context for enabled/execute checks
// ----------------------------------------------------------

export interface CommandContext {
  currentView: "dashboard" | "chat" | "search" | "editor";
  selectedFile?: string;
  activeSessionId?: string;
  query?: string;
}

// ----------------------------------------------------------
// CommandDefinition — a single executable command
// ----------------------------------------------------------

export interface CommandDefinition {
  /** Unique identifier. e.g. "workspace.open-file" */
  id: string;
  /** Display name. Shown in Command Palette. */
  title: string;
  /** Tooltip / help text. */
  description: string;
  /** Category for grouping and filtering. */
  category: CommandCategory;
  /** Search keywords for fuzzy matching in Command Palette. */
  keywords: string[];
  /** Optional keyboard shortcut. e.g. "Ctrl+P" */
  shortcut?: string;
  /** Whether this command is available in the current context. */
  enabled(context: CommandContext): boolean;
  /** Execute the command. */
  execute(context: CommandContext): void;
}

// ----------------------------------------------------------
// CommandResult — execution result
// ----------------------------------------------------------

export interface CommandResult {
  success: boolean;
  commandId: string;
  error?: string;
  payload?: unknown;
}

// ----------------------------------------------------------
// ICommandRegistry — registration + discovery
// ----------------------------------------------------------

export interface ICommandRegistry {
  register(command: CommandDefinition): void;
  unregister(id: string): void;
  find(query: string): CommandDefinition[];
  findByCategory(category: CommandCategory): CommandDefinition[];
  list(): CommandDefinition[];
  execute(id: string, context: CommandContext): CommandResult;
}

// ----------------------------------------------------------
// ICommandExecutor — execution dispatch
// ----------------------------------------------------------

export interface ICommandExecutor {
  execute(command: CommandDefinition, context: CommandContext): CommandResult;
}
