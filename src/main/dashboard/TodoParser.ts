// ============================================================
// TodoParser — pure parsing functions for TODO.md text.
//
// No filesystem. No Provider dependencies. No side effects.
// Input: TODO.md text (string).
// Output: parsed models only.
//
// Used by TodoProvider (which handles filesystem I/O) and
// BrainFocusSync (for current-focus extraction).
// ============================================================

// Structured milestone ID: M<num>[letter][.num][letter]
// Examples: M9, M9a, M9.5, M10.8a, M11d.2, M12c
export const MILESTONE_ID_RE = /M\d+(?:[a-z](?:\.\d+)?|\.\d+[a-z]?)?/;

/** Return a regex that matches a task line with the given completion status. */
function taskPattern(mark: string): RegExp {
  return new RegExp(`\\* \\[${mark}\\] (${MILESTONE_ID_RE.source}): (.+)`, "g");
}

/** Match a task line (checked or unchecked). */
const ANY_TASK_RE = new RegExp(`\\* \\[[ x]\\] (${MILESTONE_ID_RE.source}): (.+)`, "g");

// ============================================================
// Parsed types (subset of dashboard types, no FS dependency)
// ============================================================

export interface ParsedMilestone {
  phase: string;                  // "Phase 3"
  phaseLabel: string;             // "Phase 3 — Workspace Intelligence"
  currentMilestone: string;       // "M11"
  currentMilestoneName: string;   // "Command Palette UI (Ctrl+P)"
  completed: number;
  total: number;
  tasks: ParsedTask[];
}

export interface ParsedTask {
  id: string;          // "M11e"
  description: string; // "M11e: Command Palette UI (Ctrl+P)"
  completed: boolean;
}

export interface ParsedNextAction {
  priority: number;
  description: string;
  source: "TODO.md";
}

export interface ParsedCurrentFocus {
  milestone: string;   // "M11e — Command Palette UI (Ctrl+P)"
  sprint: string;      // "Sprint 4"
  goal: string;        // Sprint goal text
}

// ============================================================
// Public API
// ============================================================

/**
 * Parse milestone progress from TODO.md text.
 * Returns the first milestone group with incomplete tasks,
 * or the first group if all are complete.
 */
export function parseMilestoneProgress(text: string): ParsedMilestone | null {
  const phase = extractPhase(text);
  const phaseLabelMatch = text.match(/Phase \d+\s*[—–-]\s*(.+)/);
  const phaseLabel = phaseLabelMatch
    ? `Phase ${phase} — ${phaseLabelMatch[1]!.trim()}`
    : `Phase ${phase}`;

  const current = findCurrentMilestone(text);

  return {
    phase: `Phase ${phase}`,
    phaseLabel,
    currentMilestone: current?.milestone ?? "—",
    currentMilestoneName: current?.name ?? "—",
    completed: current?.completed ?? 0,
    total: current?.total ?? 0,
    tasks: current?.tasks ?? [],
  };
}

/**
 * Parse next actions (incomplete TODO.md tasks) from the first
 * Sprint with unchecked items. Returns priority-ordered list.
 */
export function parseNextActions(text: string): ParsedNextAction[] {
  const actions: ParsedNextAction[] = [];
  let priority = 0;

  const sprintBlocks = text.split(/# Sprint \d+\r?\n/).slice(1);
  for (let i = 0; i < sprintBlocks.length; i++) {
    const block = sprintBlocks[i]!;
    const unchecked = [...block.matchAll(taskPattern(" "))];

    if (unchecked.length > 0) {
      for (const m of unchecked) {
        priority++;
        actions.push({
          priority,
          description: `Sprint ${i + 1}: ${m[2]!.trim()}`,
          source: "TODO.md",
        });
      }
      break;
    }
  }

  return actions;
}

/**
 * Parse current focus from TODO.md text.
 * Finds the first Sprint with incomplete tasks and extracts
 * milestone + sprint name + goal.
 */
export function parseCurrentFocus(text: string): ParsedCurrentFocus | null {
  const sprintBlocks = text.split(/# Sprint \d+\r?\n/).slice(1);
  let currentSprintName = "Current";
  let currentSprintGoal = "";
  let currentMilestone = "";

  for (let i = 0; i < sprintBlocks.length; i++) {
    const block = sprintBlocks[i]!;
    const hasUncompleted = /^\* \[ \] /m.test(block);

    if (hasUncompleted) {
      currentSprintName = `Sprint ${i + 1}`;
      const firstLine = block.trim().split(/\r?\n/)[0];
      if (firstLine && !firstLine.startsWith("*")) {
        currentSprintGoal = firstLine.trim();
      }

      // Use matchAll() — .match() with g flag loses capture groups
      const firstMatch = [...block.matchAll(taskPattern(" "))][0];
      if (firstMatch) {
        currentMilestone = `${firstMatch[1]!} — ${firstMatch[2]!.trim()}`;
      }
      break;
    }
  }

  if (!currentMilestone) {
    // All Sprints complete — use the last completed milestone
    for (let i = sprintBlocks.length - 1; i >= 0; i--) {
      // Use matchAll() — .match() with g flag loses capture groups
      const taskMatches = [...sprintBlocks[i]!.matchAll(taskPattern("x"))];
      const taskMatch = taskMatches[taskMatches.length - 1];
      if (taskMatch) {
        currentMilestone = `${taskMatch[1]!} — ${taskMatch[2]!.trim()}`;
        currentSprintName = `Sprint ${i + 1}`;
        break;
      }
    }
  }

  return {
    milestone: currentMilestone || "—",
    sprint: currentSprintName || "—",
    goal: currentSprintGoal || "Continue current milestone.",
  };
}

// ============================================================
// Internal helpers
// ============================================================

function extractPhase(text: string): string {
  const m = text.match(/Phase (\d+)/);
  return m ? m[1]! : "1";
}

function findCurrentMilestone(text: string): {
  milestone: string;
  name: string;
  completed: number;
  total: number;
  tasks: ParsedTask[];
} | null {
  const sprintBlocks = text.split(/# Sprint \d+\r?\n/).slice(1);
  let allTasks: ParsedTask[] = [];

  for (const block of sprintBlocks) {
    const tasks = parseTasks(block);
    allTasks = allTasks.concat(tasks);

    const hasUncompleted = tasks.some((t) => !t.completed);
    if (hasUncompleted) break; // Found current Sprint
  }

  if (allTasks.length === 0) return null;

  // Group tasks by milestone number (e.g. M11d.1, M11d.2 → M11)
  const groups = new Map<string, ParsedTask[]>();
  for (const t of allTasks) {
    const m = t.id.match(/^M(\d+)/);
    if (m) {
      const key = `M${m[1]}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
  }

  // Find first milestone group with incomplete tasks
  for (const [milestone, tasks] of groups) {
    const hasUncompleted = tasks.some((t) => !t.completed);
    if (hasUncompleted) {
      const completed = tasks.filter((t) => t.completed).length;
      // Use first INCOMPLETE task for the name, not tasks[0] (which may be completed)
      const firstIncomplete = tasks.find((t) => !t.completed) ?? tasks[0]!;
      const name = firstIncomplete.description.replace(
        new RegExp(`^${MILESTONE_ID_RE.source}:\\s*`),
        ""
      );
      return { milestone, name, completed, total: tasks.length, tasks };
    }
  }

  // All complete — return the most recent (last) group
  const keys = Array.from(groups.keys());
  const firstKey = keys[keys.length - 1];
  if (firstKey && groups.has(firstKey)) {
    const tasks = groups.get(firstKey)!;
    return {
      milestone: firstKey,
      name: tasks[0]!.description.replace(
        new RegExp(`^${MILESTONE_ID_RE.source}:\\s*`),
        ""
      ),
      completed: tasks.length,
      total: tasks.length,
      tasks,
    };
  }

  return null;
}

function parseTasks(block: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  ANY_TASK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ANY_TASK_RE.exec(block)) !== null) {
    tasks.push({
      id: match[1]!,
      description: `${match[1]!}: ${match[2]!.trim()}`,
      completed: match[0]!.startsWith("* [x]"),
    });
  }
  return tasks;
}
