// ============================================================
// ProjectActivity — Pure Dashboard projection engine
//
// Infrastructure Layer. Zero state. Zero IO. Zero cache.
// Transforms DevelopmentState into a compact ProjectActivity
// summary for Dashboard card display.
//
// This is NOT part of DevelopmentState — it's a Dashboard-facing
// projection optimized for the "Activity" card.
// ============================================================

import type { DevelopmentState, DevelopmentWarning } from "../../shared/development/types.js";

// -----------------------------------------------------------
// Public types
// -----------------------------------------------------------

export interface ProjectActivity {
  /** Active working set summary, e.g. "M12 (8 files, active)" */
  activeWorkingSet: string | null;
  /** Completion percentage label, e.g. "75% complete" */
  completion: string;
  /** Top-priority warning summary, or null if clean */
  topWarning: string | null;
  /** Suggested next action, e.g. "Commit M12 working set" */
  nextAction: string;
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Transform DevelopmentState into a compact ProjectActivity
 * suitable for Dashboard card display.
 *
 * Pure data transformation — no side effects.
 *
 * @param state — the full development state
 * @returns ProjectActivity for Dashboard rendering
 */
export function toProjectActivity(
  state: DevelopmentState,
): ProjectActivity {
  // Active working set summary
  const activeWorkingSet =
    state.workingSet.members.length > 0
      ? `${state.workingSet.milestoneId} (${state.workingSet.members.length} files, ${state.workingSet.phase})`
      : null;

  // Completion
  const completion = `${state.completionEstimate.percentage}% complete`;

  // Top warning (highest severity first)
  const topWarning = deriveTopWarning(state);

  // Next action
  const nextAction = deriveNextAction(state);

  return {
    activeWorkingSet,
    completion,
    topWarning,
    nextAction,
  };
}

// -----------------------------------------------------------
// Internal: warning prioritization
// -----------------------------------------------------------

const SEVERITY_ORDER: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
};

function deriveTopWarning(state: DevelopmentState): string | null {
  if (state.warnings.length === 0) return null;

  // Sort by severity (error > warn > info)
  const sorted = [...state.warnings].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 99) -
      (SEVERITY_ORDER[b.severity] ?? 99),
  );

  const top = sorted[0];
  if (!top) return null;
  // Format with severity prefix
  const prefix =
    top.severity === "error"
      ? "🔴"
      : top.severity === "warn"
        ? "🟡"
        : "🔵";
  return `${prefix} ${top.message}`;
}

// -----------------------------------------------------------
// Internal: next action derivation
// -----------------------------------------------------------

/**
 * Derive an actionable recommendation from DevelopmentState.
 *
 * M13 refinement: never produces vague recommendations like
 * "Continue current work". Every recommendation is specific
 * and action-oriented.
 */
function deriveNextAction(state: DevelopmentState): string {
  const ws = state.workingSet;

  // Commit-ready → suggest commit with scope
  if (ws.isCommitReady && state.suggestedCommitScope.groups.length > 0) {
    const groupCount = state.suggestedCommitScope.groups.length;
    if (groupCount > 1) {
      return `Split into ${groupCount} commits: ${state.suggestedCommitScope.groups.map((g) => g.suggestedMessage).join("; ")}`;
    }
    return `Safe to commit: ${state.suggestedCommitScope.groups[0]?.suggestedMessage ?? `Commit ${ws.id} working set`}`;
  }

  // Blocker exists → suggest resolution
  if (ws.commitBlockerReason) {
    if (ws.members.length === 0) {
      return "Start working on milestone tasks — no files in working set";
    }
    if (ws.commitBlockerReason.includes("unknown classification")) {
      return "Review unclassified files and assign them to milestones";
    }
    if (ws.commitBlockerReason.includes("incidental")) {
      return "Separate incidental changes from milestone work";
    }
    if (ws.commitBlockerReason.includes("incomplete")) {
      return `Finish remaining ${state.milestone.taskProgress.total - state.milestone.taskProgress.completed} task(s) for milestone ${ws.milestoneId}`;
    }
    return `Resolve commit blocker: ${ws.commitBlockerReason}`;
  }

  // Mixed milestones → split
  if (state.suggestedCommitScope.mixesMultipleMilestones) {
    return "Split changes into milestone-specific commits — files from multiple milestones are mixed";
  }

  // Missing docs → update documentation
  const missingDocWarnings = state.warnings.filter(
    (w) => w.category === "missing-docs",
  );
  if (missingDocWarnings.length > 0) {
    const docCount = missingDocWarnings.length;
    return `Update ${docCount} documentation file(s) to match source changes`;
  }

  // Missing tests → add tests
  const missingTestWarnings = state.warnings.filter(
    (w) => w.category === "missing-tests",
  );
  if (missingTestWarnings.length > 0) {
    return "Add or update tests for changed source files";
  }

  // Orphan files → assign them
  if (state.suggestedCommitScope.orphanFiles.length > 0) {
    return `Assign ${state.suggestedCommitScope.orphanFiles.length} orphan file(s) to a milestone`;
  }

  // Forgotten files → add them
  if (state.suggestedCommitScope.likelyForgotten.length > 0) {
    return `Add ${state.suggestedCommitScope.likelyForgotten.length} likely-forgotten file(s) to the working set`;
  }

  // Errors present → address critical warnings
  const errors = state.warnings.filter(
    (w: DevelopmentWarning) => w.severity === "error",
  );
  if (errors.length > 0) {
    return `Address ${errors.length} critical warning(s): ${errors[0]?.message ?? "review errors"}`;
  }

  // Warnings present → review
  if (state.warnings.length > 0) {
    return `Review ${state.warnings.length} development warning(s) before continuing`;
  }

  // Clean working tree with progress → continue
  if (state.changedFiles.length > 0 && state.completionEstimate.percentage > 0) {
    return `Continue milestone ${ws.milestoneId} — ${state.completionEstimate.percentage}% complete`;
  }

  // Clean working tree, no progress
  if (state.changedFiles.length === 0 && state.milestone.isActive) {
    return `Milestone ${ws.milestoneId} is active — begin implementing tasks`;
  }

  // No active milestone
  if (!state.milestone.isActive) {
    return "No active milestone — review TODO.md to resume or start new work";
  }

  return `Check milestone ${ws.milestoneId} status`;
}
