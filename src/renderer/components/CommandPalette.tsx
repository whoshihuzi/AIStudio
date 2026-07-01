// ============================================================
// CommandPalette — Ctrl+P modal overlay for command search.
//
// Renders:
//   - Semi-transparent backdrop (click to close)
//   - Floating panel with search input + filtered results
//   - Keyboard nav: ArrowUp/Down, Enter, Escape
//
// Reads from CommandPaletteStore. Never imports from Main.
// ============================================================

import { useEffect, useRef, useCallback } from "react";
import { useCommandPaletteStore } from "@/stores/command-palette";
import type { CommandMeta } from "@/stores/command-palette";

// ----------------------------------------------------------
// Category label map
// ----------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  workspace: "Workspace",
  dashboard: "Dashboard",
  session: "Session",
  runtime: "Runtime",
  ai: "AI",
  settings: "Settings",
  navigation: "Navigation",
  plugin: "Plugin",
};

// ----------------------------------------------------------
// Sub-components
// ----------------------------------------------------------

function CommandItem({
  command,
  isSelected,
  onClick,
}: {
  command: CommandMeta;
  isSelected: boolean;
  onClick: () => void;
}) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  return (
    <div
      ref={itemRef}
      className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer border-l-2 transition-colors ${
        isSelected
          ? "bg-blue-600/30 border-blue-400"
          : "border-transparent hover:bg-gray-800"
      }`}
      onClick={onClick}
      onMouseEnter={onClick}
    >
      {/* Category badge */}
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 shrink-0 min-w-[4.5rem] text-center">
        {CATEGORY_LABELS[command.category] ?? command.category}
      </span>

      {/* Title */}
      <span className="text-sm text-gray-200 flex-1 truncate">
        {command.title}
      </span>

      {/* Shortcut */}
      {command.shortcut && (
        <span className="text-xs text-gray-500 font-mono shrink-0">
          {command.shortcut}
        </span>
      )}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    // Small delay to allow the modal to render
    const timer = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 focus-within:border-blue-500 transition-colors">
        <svg
          className="w-4 h-4 text-gray-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a command or search..."
          className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none border-none"
          spellCheck={false}
        />
        {value && (
          <span className="text-[10px] text-gray-600 bg-gray-700 px-1.5 py-0.5 rounded">
            ESC
          </span>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// CommandPalette
// ----------------------------------------------------------

export function CommandPalette() {
  const isOpen = useCommandPaletteStore((s) => s.isOpen);
  const query = useCommandPaletteStore((s) => s.query);
  const selectedIndex = useCommandPaletteStore((s) => s.selectedIndex);
  const loading = useCommandPaletteStore((s) => s.loading);
  const close = useCommandPaletteStore((s) => s.close);
  const setQuery = useCommandPaletteStore((s) => s.setQuery);
  const selectNext = useCommandPaletteStore((s) => s.selectNext);
  const selectPrevious = useCommandPaletteStore((s) => s.selectPrevious);
  const executeSelected = useCommandPaletteStore((s) => s.executeSelected);
  const getFilteredCommands = useCommandPaletteStore(
    (s) => s.getFilteredCommands,
  );

  const backdropRef = useRef<HTMLDivElement>(null);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectPrevious();
          break;
        case "Enter":
          e.preventDefault();
          executeSelected();
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [selectNext, selectPrevious, executeSelected, close],
  );

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        close();
      }
    },
    [close],
  );

  if (!isOpen) return null;

  const filtered = getFilteredCommands();

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="w-[560px] max-h-[60vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Search input */}
        <SearchInput value={query} onChange={setQuery} />

        {/* Results */}
        <div className="flex-1 overflow-y-auto pb-2">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Loading commands...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              {query.trim()
                ? "No matching commands found."
                : "No commands registered."}
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <CommandItem
                key={cmd.id}
                command={cmd}
                isSelected={i === selectedIndex}
                onClick={() => {
                  // Set selected index, then execute
                  useCommandPaletteStore.setState({ selectedIndex: i });
                  // Use setTimeout to let state update before execute closes
                  setTimeout(() => {
                    useCommandPaletteStore.getState().executeSelected();
                  }, 0);
                }}
              />
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-gray-800 flex items-center gap-4 text-[11px] text-gray-600">
          <span>
            <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-500 text-[10px]">
              ↑↓
            </kbd>{" "}
            Navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-500 text-[10px]">
              ↵
            </kbd>{" "}
            Execute
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-500 text-[10px]">
              Esc
            </kbd>{" "}
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
