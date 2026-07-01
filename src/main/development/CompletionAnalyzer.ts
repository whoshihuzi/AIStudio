// ============================================================
// CompletionAnalyzer — Pure completion estimation engine
//
// Infrastructure Layer. Zero state. Zero IO. Zero cache.
// Estimates milestone completion from task progress and file
// change coverage.
//
// Formula:
//   percentage = round((taskRatio * 0.6 + fileRatio * 0.4) * 100)
//   where taskRatio = completed/total, fileRatio = changed/estimated
// ============================================================

import type {
  CompletionEstimate,
  DevelopmentMilestone,
  WorkingSet,
} from "../../shared/development/types.js";

// -----------------------------------------------------------
// Internal: constants
// -----------------------------------------------------------

/** Weight of task completion in the overall percentage. */
const TASK_WEIGHT = 0.6;

/** Weight of file change coverage in the overall percentage. */
const FILE_WEIGHT = 0.4;

/**
 * Average files per task for estimation when no better data
 * is available. Used to derive estimated file count from
 * the number of tasks.
 */
const AVG_FILES_PER_TASK = 1.5;

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Estimate milestone completion based on task progress and
 * file change coverage.
 *
 * The estimate combines:
 *   1. Task completion ratio (weighted 60%)
 *   2. File coverage ratio (weighted 40%)
 *
 * The expected file count is estimated from the number of tasks
 * multiplied by an average (tasks usually touch 1–3 files each).
 *
 * @param milestone  — current milestone with task progress
 * @param workingSet — derived working set with classified files
 * @returns CompletionEstimate with percentage, task/file ratios, and label
 */
export function estimateCompletion(
  milestone: DevelopmentMilestone,
  workingSet: WorkingSet,
): CompletionEstimate {
  const { completed, total } = milestone.taskProgress;

  // Task ratio: how many tasks are done
  const taskRatio = total > 0 ? completed / total : 0;

  // File ratio: how many files changed vs estimated
  const estimatedFiles = Math.max(
    1,
    Math.round(total * AVG_FILES_PER_TASK),
  );
  const changedFiles = workingSet.members.length;
  const fileRatio = Math.min(1, changedFiles / estimatedFiles);

  // Weighted percentage
  const percentage = Math.round(
    (taskRatio * TASK_WEIGHT + fileRatio * FILE_WEIGHT) * 100,
  );

  // Human-readable label
  const label = `${percentage}% — ${completed} of ${total} tasks, ${changedFiles} files changed`;

  return {
    percentage: Math.max(0, Math.min(100, percentage)),
    tasks: { completed, total },
    files: { changed: changedFiles, estimated: estimatedFiles },
    label,
  };
}
