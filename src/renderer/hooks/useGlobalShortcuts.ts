// ============================================================
// useGlobalShortcuts — global keyboard shortcut → Command dispatch.
//
// Loads command list (with shortcut metadata) from
// CommandPaletteStore and registers a global keydown listener
// that dispatches matching commands via window.api.command.execute.
//
// Rules:
//   - Knows nothing about specific commands — operates purely on
//     the shortcut metadata from the registry.
//   - Does not handle text-input focus — delegates to caller.
//   - All shortcut processing is synchronous; execution is fire-and-forget.
// ============================================================

import { useEffect, useMemo } from "react";
import { useCommandPaletteStore } from "@/stores/command-palette";

// ----------------------------------------------------------
// Normalize a KeyboardEvent into a stable shortcut string
// matching the format used in CommandMeta.shortcut.
// e.g. Ctrl+Shift+D, F5, Escape
// ----------------------------------------------------------

function eventToShortcut(e: KeyboardEvent): string {
  const parts: string[] = [];

  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  // Normalize key name: "Backspace" is never a shortcut key,
  // "Delete" maps to Del, letters stay uppercase.
  const key = keyName(e);
  if (!key) return "";

  parts.push(key);
  return parts.join("+");
}

function keyName(e: KeyboardEvent): string {
  // Special keys
  if (e.key === "Escape") return "Escape";
  if (e.key === "F1") return "F1";
  if (e.key === "F2") return "F2";
  if (e.key === "F3") return "F3";
  if (e.key === "F4") return "F4";
  if (e.key === "F5") return "F5";
  if (e.key === "F6") return "F6";
  if (e.key === "F7") return "F7";
  if (e.key === "F8") return "F8";
  if (e.key === "F9") return "F9";
  if (e.key === "F10") return "F10";
  if (e.key === "F11") return "F11";
  if (e.key === "F12") return "F12";
  if (e.key === "Backspace") return ""; // never a global shortcut

  // Letters: always uppercase for matching "Ctrl+P" format
  if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
    return e.key.toUpperCase();
  }

  // Modifier-only presses — ignore
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return "";

  return e.key;
}

// ----------------------------------------------------------
// Hook
// ----------------------------------------------------------

/**
 * Register global keyboard shortcuts from the Command registry.
 *
 * Usage (once at App root):
 *   useGlobalShortcuts({ ignoreWhen: () => isInputFocused() });
 *
 * When a registered shortcut is pressed, dispatches
 * `window.api.command.execute(id)` and calls `preventDefault()`.
 */
export function useGlobalShortcuts(opts?: {
  /** Return true to suppress shortcut handling (e.g. when an
   *  input/textarea is focused). Default: never suppress. */
  ignoreWhen?: () => boolean;
}) {
  const commands = useCommandPaletteStore((s) => s.commands);

  // Build shortcut → commandId map. Rebuilt when command list changes.
  const shortcutMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cmd of commands) {
      if (cmd.shortcut) {
        // Normalize: "Ctrl+Shift+D" or "F5" or "Escape"
        map.set(cmd.shortcut, cmd.id);
      }
    }
    return map;
  }, [commands]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if caller-supplied condition says so
      if (opts?.ignoreWhen?.()) return;

      const shortcut = eventToShortcut(e);
      if (!shortcut) return;

      const commandId = shortcutMap.get(shortcut);
      if (!commandId) return;

      e.preventDefault();
      e.stopPropagation();

      // Fire-and-forget execution
      window.api.command.execute(commandId).catch(() => {
        // Silently ignore — execution failures are logged in Main
      });
    };

    window.addEventListener("keydown", handler, true); // capture phase
    return () => window.removeEventListener("keydown", handler, true);
  }, [shortcutMap, opts]);
}
