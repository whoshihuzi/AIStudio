// ============================================================
// TodoProvider — parses docs/09_TODO.md for Sprint structure.
// Internal implementation detail of the Main process.
// ============================================================

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { MilestoneProgress, SprintStatus, NextAction } from "./types.js";

export class TodoProvider {
  private readonly path: string;

  constructor() {
    this.path = join(process.cwd(), "docs", "09_TODO.md");
  }

  // ----------------------------------------------------------
  // Parse TODO.md into structured milestone progress
  // ----------------------------------------------------------

  getMilestoneProgress(): MilestoneProgress | null {
    try {
      if (!existsSync(this.path)) return null;
      const text = readFileSync(this.path, "utf-8");

      const phase = this.extractPhase(text);
      const sprints = this.parseSprints(text);
      const completed = sprints.filter((s) => s.completed).length;

      return {
        phase: `Phase ${phase}`,
        currentSprint: completed + 1,
        completedSprints: completed,
        totalSprints: sprints.length,
        progressPercent: sprints.length > 0 ? Math.round((completed / sprints.length) * 100) : 0,
        sprints,
        baseline: { tag: "", commit: "", commitsSince: 0 },
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
      const actions: NextAction[] = [];
      let priority = 0;

      // Find unchecked tasks in the first incomplete Sprint
      const sprintBlocks = text.split(/# Sprint \d+\n/).slice(1);
      for (let i = 0; i < sprintBlocks.length; i++) {
        const block = sprintBlocks[i]!;
        const sprintNum = i + 1;
        const unchecked = [...block.matchAll(/\* \[ \] (.+)/g)];

        if (unchecked.length > 0) {
          for (const m of unchecked) {
            priority++;
            actions.push({
              priority,
              description: `Sprint ${sprintNum}: ${m[1]!.trim()}`,
              source: "TODO.md",
            });
          }
          break; // Only show the first incomplete Sprint
        }
      }

      // If all Sprints complete, check for working tree issues from the
      // WIP files note (handled by NextActions if git is dirty)
      return actions;
    } catch {
      return [];
    }
  }

  // ----------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------

  private extractPhase(text: string): string {
    const m = text.match(/Phase (\d+)/);
    return m ? m[1]! : "1";
  }

  private parseSprints(text: string): SprintStatus[] {
    const sprints: SprintStatus[] = [];
    const sprintRegex = /# Sprint (\d+)\n+\n([^\n]+)\n+([\s\S]*?)(?=\n---|\n# Sprint|\n# Sprint Goal|$)/g;
    let match: RegExpExecArray | null;

    while ((match = sprintRegex.exec(text)) !== null) {
      const num = parseInt(match[1]!, 10);
      const name = match[2]!.trim();
      const body = match[3]!;
      const tasks = [...body.matchAll(/\* \[([ x])\] (.+)/g)];
      const completed = tasks.filter((t) => t[1] === "x").length;

      sprints.push({
        number: num,
        name,
        completed: tasks.length > 0 && completed === tasks.length,
        totalTasks: tasks.length,
        completedTasks: completed,
      });
    }

    return sprints;
  }
}
