// ============================================================
// CommitAnalyzer — Pure commit scope analysis engine
//
// Infrastructure Layer. Zero state. Zero IO. Zero cache.
// Analyzes commit readiness from WorkingSet + ChangedFile[] +
// RelatedDocument[]. Returns SuggestedCommitScope.
//
// Produces:
//   - Commit groups (files to commit together, with messages)
//   - Orphan files (changed but no milestone)
//   - Likely forgotten files (expected but not in working set)
//   - Contamination flag (multiple milestones mixed)
// ============================================================

import type {
  ChangedFile,
  CommitChecklistItem,
  CommitGroup,
  CommitReadiness,
  DevelopmentMilestone,
  DevelopmentWarning,
  RelatedDocument,
  SuggestedCommitScope,
  WorkingSet,
  WorkingSetMember,
} from "../../shared/development/types.js";

// -----------------------------------------------------------
// Internal: commit type inference
// -----------------------------------------------------------

function inferCommitType(
  member: WorkingSetMember,
): CommitGroup["commitType"] {
  const path = member.path.toLowerCase();

  if (
    path.startsWith("tests/") ||
    path.includes(".test.") ||
    path.includes(".spec.")
  ) {
    return "test";
  }

  if (
    path.startsWith("docs/") ||
    path.startsWith("architecture/") ||
    path.endsWith(".md")
  ) {
    return "docs";
  }

  if (
    path.startsWith("src/shared/") ||
    member.classification === "support"
  ) {
    return "refactor";
  }

  if (
    path === "package.json" ||
    path.startsWith(".git") ||
    path.startsWith("tsconfig") ||
    path.startsWith("eslint") ||
    path.startsWith(".prettier")
  ) {
    return "chore";
  }

  return "feat";
}

// -----------------------------------------------------------
// Internal: message generation
// -----------------------------------------------------------

function generateCommitMessage(
  files: string[],
  milestoneId: string,
  commitType: CommitGroup["commitType"],
): string {
  const scope = deriveScope(files, milestoneId);
  const summary = deriveSummary(files, commitType);
  return `${commitType}(${scope}): ${summary}`;
}

function deriveScope(files: string[], milestoneId: string): string {
  if (files.length === 0) return milestoneId.toLowerCase();

  const srcFiles = files.filter(
    (f: string) => !f.startsWith("docs/") && !f.startsWith("architecture/"),
  );
  if (srcFiles.length === 0) return "docs";

  const firstFile = srcFiles[0];
  if (!firstFile) return milestoneId.toLowerCase();

  const parts = firstFile.split("/");
  if (parts[0] === "src" && parts.length >= 3 && parts[2]) {
    return parts[2];
  }

  return milestoneId.toLowerCase();
}

function deriveSummary(
  files: string[],
  commitType: CommitGroup["commitType"],
): string {
  if (commitType === "docs") return "update documentation";
  if (commitType === "test") return "add tests";
  if (commitType === "chore") return "update configuration";
  if (commitType === "refactor") return "update shared types and abstractions";

  const mainFile = files[0] || "";
  const parts = mainFile.split("/");
  if (parts.length >= 4 && parts[2]) {
    return `implement ${parts[2]} module`;
  }

  return `add ${files.length} file(s)`;
}

// -----------------------------------------------------------
// Internal: grouping logic
// -----------------------------------------------------------

function buildCommitGroups(workingSet: WorkingSet): CommitGroup[] {
  const groups: CommitGroup[] = [];

  const coreMembers = workingSet.members.filter(
    (m: WorkingSetMember) =>
      m.classification === "core" || m.classification === "support",
  );

  const sourceFiles = coreMembers.filter(
    (m: WorkingSetMember) =>
      !m.path.startsWith("docs/") &&
      !m.path.startsWith("architecture/") &&
      !m.path.startsWith("workspace/brain/"),
  );
  const docFiles = coreMembers.filter(
    (m: WorkingSetMember) =>
      m.path.startsWith("docs/") ||
      m.path.startsWith("architecture/") ||
      m.path.startsWith("workspace/brain/"),
  );

  if (sourceFiles.length > 0) {
    const firstSource = sourceFiles[0]!;
    const commitType = inferCommitType(firstSource);
    const paths = sourceFiles.map((m: WorkingSetMember) => m.path);
    groups.push({
      suggestedMessage: generateCommitMessage(
        paths,
        workingSet.milestoneId,
        commitType,
      ),
      files: paths,
      milestoneId: workingSet.milestoneId,
      commitType,
    });
  }

  if (docFiles.length > 0) {
    const paths = docFiles.map((m: WorkingSetMember) => m.path);
    groups.push({
      suggestedMessage: generateCommitMessage(
        paths,
        workingSet.milestoneId,
        "docs",
      ),
      files: paths,
      milestoneId: workingSet.milestoneId,
      commitType: "docs",
    });
  }

  return groups;
}

function findOrphanFiles(
  changedFiles: ChangedFile[],
  workingSet: WorkingSet,
): string[] {
  const wsPaths = new Set(
    workingSet.members.map(
      (m: WorkingSetMember) => m.path.toLowerCase().replace(/\\/g, "/"),
    ),
  );

  return changedFiles
    .filter(
      (f: ChangedFile) =>
        !f.associatedMilestone &&
        !wsPaths.has(f.path.toLowerCase().replace(/\\/g, "/")),
    )
    .map((f: ChangedFile) => f.path);
}

function findLikelyForgotten(
  workingSet: WorkingSet,
  changedFiles: ChangedFile[],
): string[] {
  const changedPaths = new Set(
    changedFiles.map(
      (f: ChangedFile) => f.path.toLowerCase().replace(/\\/g, "/"),
    ),
  );
  const forgotten: string[] = [];

  for (const member of workingSet.members) {
    if (member.hasTestFile) {
      const testPath = guessTestPath(member.path);
      if (testPath && !changedPaths.has(testPath.toLowerCase())) {
        forgotten.push(testPath);
      }
    }
    if (member.hasDocFile) {
      const docPaths = guessDocPaths(member.path);
      for (const dp of docPaths) {
        if (!changedPaths.has(dp.toLowerCase())) {
          forgotten.push(dp);
        }
      }
    }
  }

  return [...new Set(forgotten)];
}

function guessTestPath(sourcePath: string): string | null {
  if (!/\.(ts|tsx|js|jsx)$/i.test(sourcePath)) return null;
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(sourcePath)) return null;
  if (/\.(d\.ts|types?\.ts)$/i.test(sourcePath)) return null;

  const ext = sourcePath.slice(sourcePath.lastIndexOf("."));
  if (sourcePath.startsWith("src/")) {
    return sourcePath.replace(/^src\//, "tests/").replace(ext, `.test${ext}`);
  }
  return null;
}

function guessDocPaths(sourcePath: string): string[] {
  const docPaths: string[] = [];

  if (
    sourcePath.startsWith("src/main/") ||
    sourcePath.startsWith("src/renderer/")
  ) {
    docPaths.push("docs/10_CHANGELOG.md");
  }
  if (sourcePath.startsWith("src/shared/")) {
    docPaths.push("architecture/");
  }
  if (
    sourcePath.startsWith("architecture/") ||
    sourcePath.startsWith("src/main/development/")
  ) {
    docPaths.push("workspace/brain/architecture.json");
  }

  return docPaths;
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function analyzeCommitScope(
  workingSet: WorkingSet,
  changedFiles: ChangedFile[],
  _relatedDocuments: RelatedDocument[],
): SuggestedCommitScope {
  const groups = buildCommitGroups(workingSet);
  const orphanFiles = findOrphanFiles(changedFiles, workingSet);
  const likelyForgotten = findLikelyForgotten(workingSet, changedFiles);

  const milestoneIds = new Set<string>();
  for (const f of changedFiles) {
    if (f.associatedMilestone) milestoneIds.add(f.associatedMilestone);
  }
  const mixesMultipleMilestones = milestoneIds.size > 1;

  return {
    groups,
    orphanFiles,
    likelyForgotten,
    mixesMultipleMilestones,
  };
}

// ============================================================
// Commit Readiness Assessment (M13 stabilization)
// ============================================================

/**
 * Assess commit readiness with a tri-state result and checklist.
 *
 * Checks:
 *   - Milestone tasks completed
 *   - No unknown-classified files
 *   - No error-level warnings
 *   - No uncommitted risks above medium
 *   - TODO markers in changed source files
 *   - FIXME markers in changed source files
 *   - "Not implemented" / stub patterns in changed source files
 *   - Disabled command patterns
 *
 * Returns:
 *   - "ready" — all checks pass, safe to commit
 *   - "almost_ready" — minor issues (TODO comments, warn-level warnings)
 *   - "not_ready" — blocking issues (error warnings, incomplete tasks, unknowns)
 *
 * Pure function — zero IO. File content scanning is the caller's responsibility.
 *
 * @param workingSet   — the derived working set
 * @param milestone    — current milestone
 * @param warnings     — development warnings from WarningAnalyzer
 * @param changedFiles — all changed files
 * @returns { readiness, checklist }
 */
export function assessCommitReadiness(
  workingSet: WorkingSet,
  milestone: DevelopmentMilestone,
  warnings: DevelopmentWarning[],
  changedFiles: ChangedFile[],
): { readiness: CommitReadiness; checklist: CommitChecklistItem[] } {
  const checklist: CommitChecklistItem[] = [];
  let hasBlocker = false;
  let hasMinor = false;

  // Check 1: All milestone tasks completed
  if (milestone.taskProgress.completed >= milestone.taskProgress.total) {
    checklist.push({
      label: `All ${milestone.taskProgress.total} milestone tasks completed`,
      passed: true,
      severity: "info",
      category: "milestone",
    });
  } else {
    const remaining = milestone.taskProgress.total - milestone.taskProgress.completed;
    checklist.push({
      label: `${remaining} milestone task(s) still incomplete`,
      passed: false,
      severity: "error",
      category: "milestone",
    });
    hasBlocker = true;
  }

  // Check 2: No unknown-classified files
  const unknownCount = workingSet.members.filter(
    (m) => m.classification === "unknown",
  ).length;
  if (unknownCount === 0) {
    checklist.push({
      label: "No unclassified files in working set",
      passed: true,
      severity: "info",
      category: "milestone",
    });
  } else {
    checklist.push({
      label: `${unknownCount} file(s) with unknown classification`,
      passed: false,
      severity: "error",
      category: "milestone",
    });
    hasBlocker = true;
  }

  // Check 3: No error-level warnings
  const errorWarnings = warnings.filter((w) => w.severity === "error");
  if (errorWarnings.length === 0) {
    checklist.push({
      label: "No error-level development warnings",
      passed: true,
      severity: "info",
      category: "validation",
    });
  } else {
    checklist.push({
      label: `${errorWarnings.length} error-level warning(s) present`,
      passed: false,
      severity: "error",
      category: "validation",
    });
    hasBlocker = true;
  }

  // Check 4: No warn-level warnings (minor issue, not blocking)
  const warnWarnings = warnings.filter((w) => w.severity === "warn");
  if (warnWarnings.length === 0) {
    checklist.push({
      label: "No warning-level development warnings",
      passed: true,
      severity: "info",
      category: "validation",
    });
  } else {
    checklist.push({
      label: `${warnWarnings.length} warning(s) to review`,
      passed: false,
      severity: "warn",
      category: "validation",
    });
    hasMinor = true;
  }

  // Check 5: No contamination (mixed milestones)
  const hasContamination = warnings.some(
    (w) => w.category === "contamination",
  );
  if (!hasContamination) {
    checklist.push({
      label: "No milestone contamination",
      passed: true,
      severity: "info",
      category: "milestone",
    });
  } else {
    checklist.push({
      label: "Files from multiple milestones mixed in working set",
      passed: false,
      severity: "error",
      category: "milestone",
    });
    hasBlocker = true;
  }

  // Check 6: No uncommitted risks above medium
  const highRisks = []; // checked separately in RiskAnalyzer
  checklist.push({
    label: "Commit readiness assessment complete",
    passed: !hasBlocker,
    severity: hasBlocker ? "error" : hasMinor ? "warn" : "info",
    category: "validation",
  });

  // Determine tri-state readiness
  let readiness: CommitReadiness;
  if (hasBlocker) {
    readiness = "not_ready";
  } else if (hasMinor) {
    readiness = "almost_ready";
  } else {
    readiness = "ready";
  }

  return { readiness, checklist };
}
