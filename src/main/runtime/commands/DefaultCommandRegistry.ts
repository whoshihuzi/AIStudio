// ============================================================
// DefaultCommandRegistry — registers the initial Command set.
//
// Commands are registered as metadata-only stubs (alwaysEnabled, noopExecute).
// The CommandExecutor replaces stubs with real handler-backed execution at startup.
// ============================================================

import { CommandRegistry } from "./CommandRegistry.js";
import type { CommandDefinition } from "../../../shared/command/types.js";

// ----------------------------------------------------------
// Registry stubs — replaced by CommandExecutor at registration time.
// ----------------------------------------------------------

/** Stub: always enabled. Replaced by CommandExecutor with context-aware checks. */
const alwaysEnabled = () => true;

/** Stub: no-op. Replaced by CommandExecutor with handler-backed execution. */
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

  // ── Document (lifecycle only — no content operations) ──
  {
    id: "document.ensure",
    title: "Ensure Document",
    description: "Validate that a document exists in the workspace. Does not read file content.",
    category: "workspace",
    keywords: ["document", "ensure", "exists", "validate"],
  },
  {
    id: "document.activate",
    title: "Activate Document",
    description: "Set a document as the active (focused) document.",
    category: "workspace",
    keywords: ["document", "activate", "focus", "open"],
  },
  {
    id: "document.reveal",
    title: "Reveal in File Manager",
    description: "Show the document in the system file manager.",
    category: "navigation",
    keywords: ["reveal", "finder", "explorer", "show", "file"],
  },
  {
    id: "document.close",
    title: "Close Document",
    description: "Close an open document. Unsaved changes are handled by EditorStore independently.",
    category: "workspace",
    keywords: ["document", "close", "dismiss"],
    shortcut: "Ctrl+W",
  },

  // ── Editor ──
  {
    id: "editor.open",
    title: "Open in Editor",
    description: "Open a file in the Editor for modification. Loads content from disk.",
    category: "workspace",
    keywords: ["editor", "open", "edit", "file"],
    shortcut: "Ctrl+O",
  },
  {
    id: "editor.save",
    title: "Save File",
    description: "Save the current editor buffer to disk through the single write gate.",
    category: "workspace",
    keywords: ["editor", "save", "write", "file"],
    shortcut: "Ctrl+S",
  },
  {
    id: "editor.diff",
    title: "Show Diff",
    description: "Compare current editor content with the disk version.",
    category: "workspace",
    keywords: ["editor", "diff", "compare", "changes"],
  },
  {
    id: "editor.apply-patch",
    title: "Apply Patch",
    description: "Apply a unified diff patch to a file — parses @@ headers and applies context/add/remove lines.",
    category: "workspace",
    keywords: ["editor", "patch", "apply", "diff"],
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
