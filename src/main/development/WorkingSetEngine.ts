// ============================================================
// WorkingSetEngine — Pure Working Set derivation engine
//
// Infrastructure Layer. Zero state. Zero IO. Zero cache.
// Accepts ChangedFile[] + DevelopmentMilestone,
// returns WorkingSet with classified members and derived phase.
//
// Uses FileClassifier to classify each file. Phase is derived
// from classification ratios and member count.
// ============================================================

import type {
  ChangedFile,
  DevelopmentMilestone,
  WorkingSet,
  WorkingSetMember,
  WorkingSetPhase,
} from "../../shared/development/types.js";
import { createWorkingSetId } from "../../shared/development/types.js";
import type { BrainArchitecture } from "../dashboard/types.js";

import { classifyFile, classifyByMilestone } from "./FileClassifier.js";

// -----------------------------------------------------------
// Internal: test/doc file detection
// -----------------------------------------------------------

/**
 * Check if a file path has a corresponding test file in the
 * project using common conventions.
 */
function fileHasTestFile(path: string): boolean {
  // Source files (not test themselves) may have test companions
  if (path.startsWith("tests/")) return false;
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(path)) return false;
  if (/\.(d\.ts|types?\.ts)$/i.test(path)) return false;

  // Any source file in src/ → likely has a test in tests/
  return /^src\/.*\.(ts|tsx|js|jsx)$/i.test(path);
}

/**
 * Check if a file path has a corresponding documentation file
 * that should also be updated.
 */
function fileHasDocFile(path: string): boolean {
  const normalized = path.toLowerCase();

  // Architecture and doc files ARE documentation
  if (normalized.startsWith("docs/")) return false;
  if (normalized.startsWith("architecture/")) return false;
  if (normalized.startsWith("workspace/brain/")) return false;

  // Source changes → likely need changelog/brain/docs update
  if (normalized.startsWith("src/main/")) return true;
  if (normalized.startsWith("src/shared/")) return true;

  return false;
}

// -----------------------------------------------------------
// Internal: phase derivation
// -----------------------------------------------------------

/**
 * Derive the WorkingSetPhase from member classification ratios
 * and milestone task progress.
 *
 * Lifecycle:
 *   forming     — first files detected, milestone just started
 *   active      — multiple core files, task progress > 0%
 *   stabilizing — few unknowns, task progress > 75%
 *   review      — no unknowns, no incidents, all complete
 *   committed   — set is committed (not used here — caller sets)
 *   abandoned   — set is abandoned (not used here — caller sets)
 */
function derivePhase(
  members: WorkingSetMember[],
  milestone: DevelopmentMilestone,
): WorkingSetPhase {
  if (members.length === 0) return "forming";

  const coreCount = members.filter((m) => m.classification === "core").length;
  const unknownCount = members.filter(
    (m) => m.classification === "unknown",
  ).length;
  const incidentalCount = members.filter(
    (m) => m.classification === "incidental",
  ).length;
  const taskRatio =
    milestone.taskProgress.total > 0
      ? milestone.taskProgress.completed / milestone.taskProgress.total
      : 0;

  // Review: high task completion, no unknowns, few incidentals
  if (
    taskRatio >= 1.0 &&
    unknownCount === 0 &&
    incidentalCount <= 1 &&
    coreCount > 0
  ) {
    return "review";
  }

  // Stabilizing: most tasks done, low unknowns
  if (taskRatio > 0.75 && unknownCount <= coreCount * 0.2) {
    return "stabilizing";
  }

  // Forming: very few members or no core classification yet
  if (coreCount === 0 && members.length <= 2) {
    return "forming";
  }

  // Active: anything in between
  return "active";
}

// -----------------------------------------------------------
// Internal: commit readiness
// -----------------------------------------------------------

/**
 * Determine whether the working set is commit-ready.
 *
 * Conditions:
 *   - No files classified as "unknown" (incidental docs are expected)
 *   - All tasks complete for the milestone
 */
function computeCommitReadiness(
  members: WorkingSetMember[],
  milestone: DevelopmentMilestone,
): { isReady: boolean; blockerReason: string | null } {
  if (members.length === 0) {
    return {
      isReady: false,
      blockerReason: "No files in working set",
    };
  }

  const unknowns = members.filter((m) => m.classification === "unknown");
  if (unknowns.length > 0) {
    return {
      isReady: false,
      blockerReason: `${unknowns.length} file(s) have unknown classification: ${unknowns.map((m) => m.path).join(", ")}`,
    };
  }

  // Incidental files (docs, architecture, logs, etc.) are expected
  // to change alongside code — they do not block commit readiness.
  // Only "unknown" classifications and incomplete tasks block commits.

  if (milestone.taskProgress.completed < milestone.taskProgress.total) {
    const remaining =
      milestone.taskProgress.total - milestone.taskProgress.completed;
    return {
      isReady: false,
      blockerReason: `${remaining} task(s) still incomplete in milestone ${milestone.id}`,
    };
  }

  return { isReady: true, blockerReason: null };
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Derive a WorkingSet from changed files and milestone identity.
 *
 * For each changed file:
 *   1. Classify as core/support/incidental/unknown (via FileClassifier)
 *   2. Detect test/doc file companions
 *   3. Determine change type
 *
 * Then:
 *   4. Derive WorkingSetPhase from classification ratios
 *   5. Compute commit readiness
 *
 * @param changedFiles — all changed files (from GitProvider)
 * @param milestone    — current milestone identity
 * @returns WorkingSet with classified members, phase, and readiness
 */
export function deriveWorkingSet(
  changedFiles: ChangedFile[],
  milestone: DevelopmentMilestone,
  brain?: BrainArchitecture,
): WorkingSet {
  const now = Date.now();

  // Classify each changed file
  const members: WorkingSetMember[] = changedFiles.map((f) => {
    const classification = classifyFile(
      f.path,
      f.changeType,
      milestone.id,
      brain,
    );

    return {
      path: f.path,
      classification,
      changeType: f.changeType,
      hasTestFile: fileHasTestFile(f.path),
      hasDocFile: fileHasDocFile(f.path),
    };
  });

  // Derive phase
  const phase = derivePhase(members, milestone);

  // Compute commit readiness
  const { isReady, blockerReason } = computeCommitReadiness(
    members,
    milestone,
  );

  // Find latest modification timestamp from members
  // (approximation — real value comes from filesystem)
  const lastModifiedAt = now;

  return {
    id: createWorkingSetId(milestone.id),
    milestoneId: milestone.id,
    members,
    phase,
    isCommitReady: isReady,
    commitBlockerReason: blockerReason,
    createdAt: now,
    lastModifiedAt,
  };
}

// -----------------------------------------------------------
// Public API: Multi-milestone working set derivation
// -----------------------------------------------------------

/**
 * Derive independent Working Sets by milestone from all changed files.
 *
 * Each file is classified by milestone (via path patterns in FileClassifier),
 * then files belonging to the same milestone are grouped into a single
 * Working Set. Files that cannot be assigned to any milestone are placed
 * into an "unassigned" working set with milestoneId "—".
 *
 * When only one milestone is detected, behavior is identical to
 * `deriveWorkingSet` — exactly one Working Set is returned.
 *
 * @param changedFiles — all changed files (from GitProvider)
 * @param brain        — optional brain architecture data
 * @returns WorkingSet[] — one per detected milestone, ordered by activity
 */
export function deriveWorkingSets(
  changedFiles: ChangedFile[],
  brain?: BrainArchitecture,
): WorkingSet[] {
  if (changedFiles.length === 0) return [];

  // Group files by detected milestone
  const byMilestone = new Map<string, ChangedFile[]>();

  for (const f of changedFiles) {
    const milestoneId = classifyByMilestone(f.path) ?? "—";
    if (!byMilestone.has(milestoneId)) {
      byMilestone.set(milestoneId, []);
    }
    byMilestone.get(milestoneId)!.push(f);
  }

  // Derive a WorkingSet for each milestone group
  const workingSets: WorkingSet[] = [];

  for (const [milestoneId, files] of byMilestone) {
    // Build a synthetic milestone for the group
    const syntheticMilestone: DevelopmentMilestone = {
      id: milestoneId,
      name: milestoneId === "—" ? "Unassigned" : milestoneId,
      phase: 0,
      taskProgress: { completed: 0, total: 0 },
      isActive: milestoneId !== "—",
    };

    const now = Date.now();

    const members: WorkingSetMember[] = files.map((f) => {
      const classification = classifyFile(
        f.path,
        f.changeType,
        milestoneId,
        brain,
      );

      return {
        path: f.path,
        classification,
        changeType: f.changeType,
        hasTestFile: fileHasTestFile(f.path),
        hasDocFile: fileHasDocFile(f.path),
      };
    });

    const phase = derivePhase(members, syntheticMilestone);
    const { isReady, blockerReason } = computeCommitReadiness(
      members,
      syntheticMilestone,
    );

    workingSets.push({
      id: createWorkingSetId(milestoneId),
      milestoneId,
      members,
      phase,
      isCommitReady: isReady,
      commitBlockerReason: blockerReason,
      createdAt: now,
      lastModifiedAt: now,
    });
  }

  // Sort: active milestones first, then by member count (most active first)
  workingSets.sort((a, b) => {
    if (a.milestoneId === "—") return 1;
    if (b.milestoneId === "—") return -1;
    return b.members.length - a.members.length;
  });

  return workingSets;
}
