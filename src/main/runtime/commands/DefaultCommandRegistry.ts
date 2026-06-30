// ============================================================
// DefaultCommandRegistry — registers the initial Command set.
//
// Metadata only — no execute implementations (that comes in M11d.2).
// Called once at application startup.
// ============================================================

import { CommandRegistry } from "./CommandRegistry.js";
import type { CommandDefinition } from "../../../shared/command/types.js";

// ----------------------------------------------------------
// Stub helpers — replaced by the Executor in M11d.2
// ----------------------------------------------------------

/** Stub: always enabled. Replaced when Executor wires real context checks. */
const alwaysEnabled = () => true;

/** Stub: no-op. Replaced when Executor wires real implementations. */
const noopExecute = () => {};

function stub(fields: Omit<CommandDefinition, "enabled" | "execute">): CommandDefinition {
  return {
    ...fields,
    enabled: alwaysEnabled,
    execute: noopExecute,
  };
}

// ----------------------------------------------------------
// Default command set
// ----------------------------------------------------------

const defaultCommands: Omit<CommandDefinition, "enabled" | "execute">[] = [
  // ── Dashboard ──
  {
    id: "dashboard.open",
    title: "Open Dashboard",
    description: "Navigate to the Dashboard view showing project health, workspace stats, and build status.",
    category: "dashboard",
    keywords: ["dashboard", "home", "overview", "health", "status"],
    shortcut: "Ctrl+Shift+D",
  },
  {
    id: "dashboard.refresh",
    title: "Refresh Dashboard",
    description: "Reload all Dashboard data — project brain, workspace index, and build checks.",
    category: "dashboard",
    keywords: ["refresh", "reload", "dashboard", "update"],
    shortcut: "F5",
  },

  // ── Workspace ──
  {
    id: "workspace.openFile",
    title: "Open File",
    description: "Open a workspace file in the Preview Panel.",
    category: "workspace",
    keywords: ["open", "file", "workspace", "preview", "editor"],
    shortcut: "Ctrl+P",
  },
  {
    id: "workspace.refreshIndex",
    title: "Refresh Workspace Index",
    description: "Rebuild the project file index — scan all files and update language breakdowns.",
    category: "workspace",
    keywords: ["refresh", "index", "workspace", "scan", "rebuild", "files"],
  },
  {
    id: "workspace.search",
    title: "Search Workspace",
    description: "Full-text search across all workspace files.",
    category: "workspace",
    keywords: ["search", "find", "grep", "workspace", "files", "text"],
    shortcut: "Ctrl+Shift+F",
  },

  // ── Session ──
  {
    id: "session.open",
    title: "Open Session",
    description: "Switch to an existing agent conversation session.",
    category: "session",
    keywords: ["session", "open", "chat", "conversation", "history"],
  },
  {
    id: "session.new",
    title: "New Session",
    description: "Create a new agent conversation session.",
    category: "session",
    keywords: ["session", "new", "create", "chat", "conversation", "fresh"],
    shortcut: "Ctrl+N",
  },

  // ── Runtime ──
  {
    id: "runtime.runChecks",
    title: "Run Build Checks",
    description: "Run project build checks — typecheck, lint, and test suite.",
    category: "runtime",
    keywords: ["check", "build", "typecheck", "lint", "test", "verify", "ci"],
    shortcut: "Ctrl+Shift+B",
  },

  // ── Settings ──
  {
    id: "settings.language",
    title: "Change Language",
    description: "Switch the UI language between English and 简体中文.",
    category: "settings",
    keywords: ["language", "locale", "i18n", "english", "chinese", "中文"],
    shortcut: "Ctrl+Shift+L",
  },

  // ── Preview ──
  {
    id: "preview.close",
    title: "Close Preview",
    description: "Close the file Preview Panel.",
    category: "workspace",
    keywords: ["close", "preview", "panel", "hide", "dismiss"],
    shortcut: "Escape",
  },
];

// ----------------------------------------------------------
// Factory
// ----------------------------------------------------------

/**
 * Populate a CommandRegistry with the default command set.
 *
 * Call once at application startup:
 *   const registry = new CommandRegistry();
 *   registerDefaultCommands(registry);
 */
export function registerDefaultCommands(registry: CommandRegistry): void {
  for (const cmd of defaultCommands) {
    registry.register(stub(cmd));
  }
}
