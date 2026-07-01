// ============================================================
// TodoProvider — reads docs/09_TODO.md for milestone structure.
// Internal implementation detail of the Main process.
//
// M12.6.6: delegates ALL parsing to the pure TodoParser.
// TodoProvider handles only filesystem I/O.
// ============================================================

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  parseMilestoneProgress,
  parseNextActions,
  MILESTONE_ID_RE,
} from "./TodoParser.js";
import type { MilestoneProgress, MilestoneTask, NextAction } from "./types.js";

export class TodoProvider {
  private readonly path: string;

  constructor() {
    this.path = join(process.cwd(), "docs", "09_TODO.md");
  }

  // ----------------------------------------------------------
  // Get current milestone progress (not Sprint progress)
  // ----------------------------------------------------------

  getMilestoneProgress(): MilestoneProgress | null {
    try {
      if (!existsSync(this.path)) return null;
      const text = readFileSync(this.path, "utf-8");

      const parsed = parseMilestoneProgress(text);
      if (!parsed) return null;

      return {
        phase: parsed.phase,
        phaseLabel: parsed.phaseLabel,
        currentMilestone: parsed.currentMilestone,
        currentMilestoneName: parsed.currentMilestoneName,
        milestoneProgress: `${parsed.completed}/${parsed.total} complete`,
        milestoneTasks: parsed.tasks.map((t): MilestoneTask => ({
          id: t.id,
          description: t.description,
          completed: t.completed,
        })),
        baseline: { tag: "", commit: "", commitsSince: 0, lastCommitTime: "" },
        branch: "",
        headCommit: "",
      };
    } catch {
      return null;
    }
  }

  // ----------------------------------------------------------
  // Get incomplete tasks from the current Sprint
  // ----------------------------------------------------------

  getNextActions(): NextAction[] {
    try {
      if (!existsSync(this.path)) return [];
      const text = readFileSync(this.path, "utf-8");
      return parseNextActions(text).map((a): NextAction => ({
        priority: a.priority,
        description: a.description,
        source: a.source,
      }));
    } catch {
      return [];
    }
  }
}
