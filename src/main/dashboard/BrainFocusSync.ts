// ============================================================
// BrainFocusSync — parses TODO.md to produce synced focus data.
// Called by BrainProvider so currentFocus always reflects reality.
//
// M12.6.6: delegates parsing to pure TodoParser.
// BrainFocusSync handles only filesystem I/O.
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { parseCurrentFocus } from "./TodoParser.js";
import type { BrainCurrentFocus } from "./types.js";

const TODO_PATH = join(process.cwd(), "docs", "09_TODO.md");
const FOCUS_PATH = join(process.cwd(), "workspace", "brain", "current-focus.json");

/**
 * Parse current focus from TODO.md.
 * Returns null if TODO.md doesn't exist or can't be parsed.
 *
 * Side-effect (M12.6.6): writes synced data to
 * workspace/brain/current-focus.json so Project Brain
 * stays in sync with Mission Control.
 */
export function parseCurrentFocusFromTodo(): BrainCurrentFocus | null {
  try {
    if (!existsSync(TODO_PATH)) return null;
    const text = readFileSync(TODO_PATH, "utf-8");

    const parsed = parseCurrentFocus(text);
    if (!parsed) return null;

    const focus: BrainCurrentFocus = {
      milestone: parsed.milestone,
      sprint: parsed.sprint,
      goal: parsed.goal,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };

    // M12.6.6: always write sync result to disk
    writeFocusFile(focus);

    return focus;
  } catch {
    return null;
  }
}

/** Write current-focus.json, creating parent dirs if needed. */
function writeFocusFile(focus: BrainCurrentFocus): void {
  try {
    const dir = dirname(FOCUS_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(FOCUS_PATH, JSON.stringify(focus, null, 2), "utf-8");
  } catch {
    // Non-fatal: focus data is still available in memory
  }
}
