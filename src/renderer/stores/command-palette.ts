// ============================================================
// CommandPaletteStore — Command Palette UI state.
//
// Owns: open/close, search query, keyboard navigation, execution.
// Knows nothing about the Main Process internals — only uses
// window.api.command.list() and window.api.command.execute().
// ============================================================

import { create } from "zustand";

// ----------------------------------------------------------
// CommandMeta — serializable subset of CommandDefinition
// (mirrors src/shared/command/types.ts CommandMeta, but
//  the Renderer should never import from Main/Shared directly)
// ----------------------------------------------------------

export interface CommandMeta {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  shortcut?: string;
}

// ----------------------------------------------------------
// State
// ----------------------------------------------------------

export interface CommandPaletteState {
  /** Whether the palette overlay is visible. */
  isOpen: boolean;
  /** Current search query text. */
  query: string;
  /** All commands loaded from Main Process. */
  commands: CommandMeta[];
  /** Index of the currently highlighted result (0-based). -1 = none. */
  selectedIndex: number;
  /** True while commands are loading from IPC. */
  loading: boolean;

  /** Open the palette — fetches command list from Main Process. */
  open: () => Promise<void>;
  /** Close the palette and reset state. */
  close: () => void;
  /** Update the search query and reset selection to 0. */
  setQuery: (query: string) => void;
  /** Move selection down (wrap to top). */
  selectNext: () => void;
  /** Move selection up (wrap to bottom). */
  selectPrevious: () => void;
  /** Execute the currently selected command and close the palette. */
  executeSelected: () => Promise<void>;
  /** Get the filtered commands based on current query. */
  getFilteredCommands: () => CommandMeta[];
}

// ----------------------------------------------------------
// Pure filter helper — case-insensitive across title, description, keywords
// ----------------------------------------------------------

function filterCommands(commands: CommandMeta[], query: string): CommandMeta[] {
  if (!query.trim()) {
    // Show all commands when query is empty, sorted by title
    return [...commands].sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
    );
  }

  const normalized = query.trim().toLowerCase();
  return commands
    .filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(normalized) ||
        cmd.description.toLowerCase().includes(normalized) ||
        cmd.keywords.some((kw) => kw.toLowerCase().includes(normalized)),
    )
    .sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
    );
}

// ----------------------------------------------------------
// Store
// ----------------------------------------------------------

export const useCommandPaletteStore = create<CommandPaletteState>(
  (set, get) => ({
    isOpen: false,
    query: "",
    commands: [],
    selectedIndex: 0,
    loading: false,

    open: async () => {
      set({ isOpen: true, query: "", selectedIndex: 0, loading: true });
      try {
        const list = (await window.api.command.list()) as CommandMeta[];
        set({ commands: list, loading: false });
      } catch {
        // If IPC fails, still show palette (empty command list)
        set({ commands: [], loading: false });
      }
    },

    close: () => {
      set({ isOpen: false, query: "", commands: [], selectedIndex: 0 });
    },

    setQuery: (query: string) => {
      set({ query, selectedIndex: 0 });
    },

    selectNext: () => {
      const { getFilteredCommands, selectedIndex } = get();
      const filtered = getFilteredCommands();
      if (filtered.length === 0) return;
      const next =
        selectedIndex + 1 >= filtered.length ? 0 : selectedIndex + 1;
      set({ selectedIndex: next });
    },

    selectPrevious: () => {
      const { getFilteredCommands, selectedIndex } = get();
      const filtered = getFilteredCommands();
      if (filtered.length === 0) return;
      const prev =
        selectedIndex - 1 < 0 ? filtered.length - 1 : selectedIndex - 1;
      set({ selectedIndex: prev });
    },

    executeSelected: async () => {
      const { getFilteredCommands, selectedIndex } = get();
      const filtered = getFilteredCommands();
      const command = filtered[selectedIndex];
      if (!command) return;

      // Close palette immediately for responsive feel
      get().close();

      try {
        await window.api.command.execute(command.id);
      } catch {
        // Silently ignore — command execution failures are logged in Main
      }
    },

    getFilteredCommands: () => {
      const { commands, query } = get();
      return filterCommands(commands, query);
    },
  }),
);
