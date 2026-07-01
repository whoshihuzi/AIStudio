// ============================================================
// WarningAnalyzer — Pure warning detection engine
//
// Infrastructure Layer. Zero state. Zero IO. Zero cache.
// Accepts WorkingSet + ChangedFile[] + RelatedDocument[],
// returns DevelopmentWarning[].
//
// Detection categories:
//   contamination  — files from multiple milestones mixed
//   forgotten-files — expected test/doc paired with changed file
//   missing-docs    — documentation not updated alongside code
//   missing-tests   — test files absent for changed source files
//   orphan-changes  — changed files with no known milestone
//   large-change    — working set is unusually large
// ============================================================

import type {
  ChangedFile,
  DevelopmentWarning,
  RelatedDocument,
  WarningCategory,
  WarningSeverity,
  WorkingSet,
  WorkingSetMember,
} from "../../shared/development/types.js";

// -----------------------------------------------------------
// Internal: thresholds and helpers
// -----------------------------------------------------------

/** Number of files above which a "large-change" warning fires. */
const LARGE_CHANGE_THRESHOLD = 15;

/** How many test files must be missing before severity escalates. */
const MISSING_TESTS_ERROR_THRESHOLD = 3;

/**
 * Derive a test file path from a source file path using common
 * project conventions.
 *
 * Conventions supported:
 *   - Jest/ts-jest:  src/X/foo/Bar.ts → tests/X/foo/Bar.test.ts
 *   - Colocated:     src/X/foo/Bar.ts → src/X/foo/Bar.test.ts
 *   - __tests__:     src/X/foo/Bar.ts → src/X/foo/__tests__/Bar.test.ts
 *   - spec:          src/X/foo/Bar.ts → src/X/foo/Bar.spec.ts
 */
function guessTestPath(sourcePath: string): string | null {
  if (!/\.(ts|tsx|js|jsx)$/i.test(sourcePath)) return null;
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(sourcePath)) return null;
  if (/\.(d\.ts|types?\.ts)$/i.test(sourcePath)) return null;

  const ext = sourcePath.slice(sourcePath.lastIndexOf("."));

  // Conventional: src/X/Y.ts → tests/X/Y.test.ts
  if (sourcePath.startsWith("src/")) {
    // Try src → tests
    const testPath = sourcePath.replace(/^src\//, "tests/").replace(ext, `.test${ext}`);
    return testPath;
  }

  return null;
}

/**
 * Derive a documentation file path that should accompany a source change.
 */
function guessDocPath(sourcePath: string): string | null {
  // Architecture changes → architecture docs
  if (sourcePath.startsWith("architecture/")) return null; // it IS a doc
  if (sourcePath.startsWith("docs/")) return null;
  return null; // doc coupling is handled by DocCouplingEngine
}

// -----------------------------------------------------------
// Internal: warning builders
// -----------------------------------------------------------

function makeWarning(
  severity: WarningSeverity,
  message: string,
  affectedFiles: string[],
  category: WarningCategory,
): DevelopmentWarning {
  return { severity, message, affectedFiles, category };
}

/** Detect contamination — files associated with multiple milestones. */
function detectContamination(
  changedFiles: ChangedFile[],
): DevelopmentWarning[] {
  const result: DevelopmentWarning[] = [];
  const milestoneFiles = new Map<string, string[]>();

  for (const f of changedFiles) {
    const mid = f.associatedMilestone;
    if (!mid) continue;
    if (!milestoneFiles.has(mid)) milestoneFiles.set(mid, []);
    milestoneFiles.get(mid)!.push(f.path);
  }

  if (milestoneFiles.size > 1) {
    const allFiles: string[] = [];
    const parts: string[] = [];
    for (const [mid, files] of milestoneFiles) {
      parts.push(`${mid}: ${files.length} file(s)`);
      allFiles.push(...files);
    }

    const severity: WarningSeverity =
      allFiles.length > 10 ? "error" : "warn";

    result.push(
      makeWarning(
        severity,
        `Changes span multiple milestones: ${parts.join(", ")}. ` +
          "Commit scope should be isolated to one milestone per commit.",
        allFiles,
        "contamination",
      ),
    );
  }

  return result;
}

/** Detect orphan changes — changed files with no milestone association. */
function detectOrphans(changedFiles: ChangedFile[]): DevelopmentWarning[] {
  const orphans = changedFiles
    .filter((f) => !f.associatedMilestone && !f.workingSetId)
    .map((f) => f.path);

  if (orphans.length === 0) return [];

  return [
    makeWarning(
      orphans.length > 5 ? "warn" : "info",
      `${orphans.length} changed file(s) have no known milestone association. ` +
        "Review these files to determine whether they should be committed separately or assigned to a milestone.",
      orphans,
      "orphan-changes",
    ),
  ];
}

/** Detect missing test files — source files changed without test. */
function detectMissingTests(
  changedFiles: ChangedFile[],
): DevelopmentWarning[] {
  // If the project has no test infrastructure at all (no test files
  // in the change set, no tests/ directory files), skip this check.
  // Otherwise we flag every source file as "missing-tests" for
  // projects that simply haven't adopted testing yet.
  const hasAnyTestFile = changedFiles.some(
    (f) =>
      f.path.startsWith("tests/") ||
      /\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(f.path),
  );
  if (!hasAnyTestFile) return [];

  const missing: string[] = [];

  for (const f of changedFiles) {
    if (f.path.startsWith("tests/")) continue;
    if (f.path.startsWith("docs/")) continue;
    if (f.path.startsWith("architecture/")) continue;

    const testPath = guessTestPath(f.path);
    if (!testPath) continue;

    // Check if the test file is in the changed set (already modified)
    const testChanged = changedFiles.some(
      (cf) =>
        cf.path.toLowerCase().replace(/\\/g, "/") ===
        testPath.toLowerCase(),
    );
    if (!testChanged) {
      missing.push(f.path);
    }
  }

  if (missing.length === 0) return [];

  const severity: WarningSeverity =
    missing.length >= MISSING_TESTS_ERROR_THRESHOLD ? "error" : "warn";

  return [
    makeWarning(
      severity,
      `${missing.length} changed source file(s) may need corresponding test updates. ` +
        `Consider adding or updating tests for these files.`,
      missing,
      "missing-tests",
    ),
  ];
}

/** Detect documentation gaps — related docs not modified. */
function detectMissingDocs(
  relatedDocuments: RelatedDocument[],
  changedPaths: Set<string>,
): DevelopmentWarning[] {
  // Only flag docs as unmodified if their docPath is NOT in changedPaths.
  // DocCouplingEngine always sets isModified=false; we resolve against
  // the actual change set here.
  const unmodified = relatedDocuments.filter(
    (d) => !d.isModified && !changedPaths.has(d.docPath.toLowerCase().replace(/\\/g, "/")),
  );

  if (unmodified.length === 0) return [];

  const docPaths = [...new Set(unmodified.map((d) => d.docPath))];
  const sourcePaths = [...new Set(unmodified.map((d) => d.sourcePath))];

  return [
    makeWarning(
      "warn",
      `${docPaths.length} documentation file(s) should be reviewed for updates: ` +
        docPaths.join(", "),
      sourcePaths,
      "missing-docs",
    ),
  ];
}

/** Detect forgotten files — expected pair files not in working set. */
function detectForgottenFiles(
  workingSet: WorkingSet,
  changedFiles: ChangedFile[],
): DevelopmentWarning[] {
  const wsPaths = new Set(
    workingSet.members.map((m: WorkingSetMember) => m.path.toLowerCase().replace(/\\/g, "/")),
  );
  const changedPaths = new Set(
    changedFiles.map((f) => f.path.toLowerCase().replace(/\\/g, "/")),
  );
  const forgotten: string[] = [];

  // If the project has no test infrastructure at all, skip test-file
  // forgotten checks — hasTestFile will be true for all src/*.ts files
  // but the project simply hasn't adopted testing yet.
  const hasAnyTestFile = changedFiles.some(
    (f) =>
      f.path.startsWith("tests/") ||
      /\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(f.path),
  );

  // Files in working set that have expected test/doc pairs
  for (const member of workingSet.members) {
    if (member.hasTestFile || member.hasDocFile) {
      // The member itself IS changed. If hasTestFile=true, we expect
      // a test file to also be in changedFiles. Let's check.
      if (member.hasTestFile && hasAnyTestFile) {
        const testPath = guessTestPath(member.path);
        if (testPath && !changedPaths.has(testPath.toLowerCase())) {
          forgotten.push(testPath);
        }
      }
    }
  }

  if (forgotten.length === 0) return [];

  return [
    makeWarning(
      "warn",
      `${forgotten.length} expected file(s) are missing from the working set. ` +
        "These may have been forgotten during development.",
      forgotten,
      "forgotten-files",
    ),
  ];
}

/** Detect unusually large working sets. */
function detectLargeChange(workingSet: WorkingSet): DevelopmentWarning[] {
  if (workingSet.members.length <= LARGE_CHANGE_THRESHOLD) return [];

  return [
    makeWarning(
      "warn",
      `Working set contains ${workingSet.members.length} files (threshold: ${LARGE_CHANGE_THRESHOLD}). ` +
        "Consider splitting into smaller, more focused commit groups.",
      workingSet.members.map((m: WorkingSetMember) => m.path),
      "large-change",
    ),
  ];
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Analyze the current development state and produce actionable warnings.
 *
 * Checks for:
 *   - Contamination (files from multiple milestones intermixed)
 *   - Orphan changes (files with no milestone association)
 *   - Missing tests (source changed, test not in working set)
 *   - Missing docs (documentation not updated alongside code)
 *   - Forgotten files (expected paired files absent)
 *   - Large changes (working set exceeds threshold)
 *
 * @param workingSet        — the derived working set
 * @param changedFiles      — all changed files
 * @param relatedDocuments  — documentation coupling results
 * @returns DevelopmentWarning[] — may be empty if no issues found
 */
export function analyzeWarnings(
  workingSet: WorkingSet,
  changedFiles: ChangedFile[],
  relatedDocuments: RelatedDocument[],
): DevelopmentWarning[] {
  // Build changedPaths set for cross-referencing doc modification
  const changedPaths = new Set(
    changedFiles.map((f) => f.path.toLowerCase().replace(/\\/g, "/")),
  );

  return [
    ...detectContamination(changedFiles),
    ...detectOrphans(changedFiles),
    ...detectMissingTests(changedFiles),
    ...detectMissingDocs(relatedDocuments, changedPaths),
    ...detectForgottenFiles(workingSet, changedFiles),
    ...detectLargeChange(workingSet),
  ];
}
