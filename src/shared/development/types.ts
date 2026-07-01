// ============================================================
// Development Intelligence Resource Model
// Shared between Main and Renderer — Domain Layer (frozen)
// No Electron imports. No Node.js imports. Pure data types.
// Frozen per architecture/16_DEVELOPMENT_INTELLIGENCE.md Section 3.
// ============================================================

// ============================================================
// Helper Types — extracted from inline unions for reuse
// ============================================================

/** Severity levels for development warnings. */
export type WarningSeverity = "info" | "warn" | "error";

/** Risk severity levels for uncommitted state. */
export type RiskLevel = "low" | "medium" | "high";

// ============================================================
// Milestone Identity
// ============================================================

export interface DevelopmentMilestone {
  /** e.g. "M12" */
  id: string;
  /** e.g. "Editor Foundation" */
  name: string;
  /** Current phase (e.g. 3) */
  phase: number;
  /** Number of completed tasks / total tasks */
  taskProgress: { completed: number; total: number };
  /** Whether this milestone is the current active one */
  isActive: boolean;
}

export interface DevelopmentSprint {
  /** e.g. 4 */
  number: number;
  /** e.g. "Command System + Search UI" */
  goal: string;
  /** Whether this sprint is the current active one */
  isActive: boolean;
}

// ============================================================
// Working Set
// ============================================================

export type WorkingSetPhase =
  | "forming"     // Files being added to set
  | "active"      // Set is being worked on
  | "stabilizing" // Most files done, polishing
  | "review"      // Ready for review
  | "committed"   // Set has been committed
  | "abandoned";  // Set was discarded

export type FileClassification =
  | "core"        // Directly implements the milestone objective
  | "support"     // Supporting change (type, utility, config)
  | "incidental"  // Changed but unrelated to current milestone
  | "unknown";    // Cannot yet classify

export type FileChangeType =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "untracked";

export interface WorkingSetMember {
  /** Path relative to workspace root */
  path: string;
  /** How this file relates to the milestone */
  classification: FileClassification;
  /** Whether the file has been modified, added, or deleted */
  changeType: FileChangeType;
  /** Whether this file has a corresponding test file that should also change */
  hasTestFile: boolean;
  /** Whether this file has a corresponding doc file that should also change */
  hasDocFile: boolean;
}

export interface WorkingSet {
  /** Unique identifier for this working set (derived from milestone id) */
  id: string;
  /** The milestone this working set belongs to */
  milestoneId: string;
  /** Files that belong to this working set */
  members: WorkingSetMember[];
  /** Current lifecycle phase */
  phase: WorkingSetPhase;
  /** Whether the working set is ready to commit */
  isCommitReady: boolean;
  /** Reason if not commit-ready */
  commitBlockerReason: string | null;
  /** Timestamp when the working set was first detected */
  createdAt: number;
  /** Timestamp of the last change to any member file */
  lastModifiedAt: number;
}

// ============================================================
// Changed Files
// ============================================================

export interface ChangedFile {
  /** Path relative to workspace root */
  path: string;
  /** Change type from Git */
  changeType: FileChangeType;
  /** Which milestone this file most likely belongs to (if known) */
  associatedMilestone: string | null;
  /** Which working set this file belongs to (if any) */
  workingSetId: string | null;
  /** Whether this file is staged */
  staged: boolean;
}

// ============================================================
// Related Documents
// ============================================================

export type DocRelationship =
  | "architecture"     // Source is referenced in an architecture doc
  | "implementation-docs" // Implementation-level documentation (not architecture)
  | "changelog"        // Change should be recorded in changelog
  | "todo"             // Task status should be updated in TODO.md
  | "brain"            // Brain data should be refreshed
  | "principle"        // Change may affect documented design principles
  | "roadmap"          // Change affects the roadmap
  | "logs";            // Development log should be updated

export interface RelatedDocument {
  /** Path to the source file that triggered this doc relationship */
  sourcePath: string;
  /** Path to the related documentation file */
  docPath: string;
  /** The nature of the relationship */
  relationship: DocRelationship;
  /** Whether the doc file has been modified in the working tree */
  isModified: boolean;
}

// ============================================================
// Commit Intelligence
// ============================================================

export interface CommitGroup {
  /** Suggested commit message */
  suggestedMessage: string;
  /** Files in this group */
  files: string[];
  /** Which milestone this group relates to */
  milestoneId: string;
  /** Conventional commit type */
  commitType: "feat" | "fix" | "refactor" | "docs" | "test" | "chore";
}

export interface SuggestedCommitScope {
  /** Recommended single-commit file groups */
  groups: CommitGroup[];
  /** Files that appear to belong to no milestone (orphan changes) */
  orphanFiles: string[];
  /** Files likely forgotten (should be in working set but aren't) */
  likelyForgotten: string[];
  /** Whether the changes mix multiple milestones (bad practice) */
  mixesMultipleMilestones: boolean;
}

// ============================================================
// Warnings
// ============================================================

export type WarningCategory =
  | "contamination"   // Files from multiple milestones mixed
  | "forgotten-files" // Expected file not in working set
  | "missing-docs"    // Documentation not updated alongside code
  | "missing-tests"   // Test files not updated alongside source
  | "orphan-changes"  // Changed files with no known milestone
  | "large-change"    // Working set is unusually large
  | "stale-branch";   // Branch is behind/ahead of remote

export interface DevelopmentWarning {
  /** Warning severity */
  severity: WarningSeverity;
  /** Human-readable warning message */
  message: string;
  /** Which files are affected (empty if global) */
  affectedFiles: string[];
  /** Category for filtering/grouping */
  category: WarningCategory;
}

// ============================================================
// Completion Estimate
// ============================================================

export interface CompletionEstimate {
  /** Percentage complete (0–100) */
  percentage: number;
  /** Tasks complete / total in the current milestone */
  tasks: { completed: number; total: number };
  /** Files changed so far / total files expected to change */
  files: { changed: number; estimated: number };
  /** Human-readable label (e.g. "60% — 3 of 5 tasks, 8 files changed") */
  label: string;
}

// ============================================================
// Uncommitted Risks
// ============================================================

export interface UncommittedRisk {
  /** Risk description */
  description: string;
  /** Severity */
  severity: RiskLevel;
  /** Mitigation recommendation */
  mitigation: string;
}

// ============================================================
// Commit Readiness
// ============================================================

/** Tri-state commit readiness assessment. */
export type CommitReadiness = "ready" | "almost_ready" | "not_ready";

export interface CommitChecklistItem {
  /** Short description of the check */
  label: string;
  /** Whether this check passed */
  passed: boolean;
  /** Severity if not passed */
  severity: "info" | "warn" | "error";
  /** Category: what kind of check */
  category: "todo" | "fixme" | "stub" | "not-implemented" | "disabled" | "validation" | "milestone";
}

// ============================================================
// DevelopmentState — top-level aggregate
// ============================================================

export interface DevelopmentState {
  /** Current milestone identity from TODO.md + Brain */
  milestone: DevelopmentMilestone;
  /** Current sprint identity */
  sprint: DevelopmentSprint;
  /** All changed files, classified by relationship to current work */
  workingSet: WorkingSet;
  /** All independent working sets detected, grouped by milestone */
  workingSets: WorkingSet[];
  /** All tracked files (modified + staged + untracked) */
  changedFiles: ChangedFile[];
  /** Documentation files that should be reviewed/updated alongside source changes */
  relatedDocuments: RelatedDocument[];
  /** Recommended commit scope: which files belong together in one commit */
  suggestedCommitScope: SuggestedCommitScope;
  /** Active warnings about the current development state */
  warnings: DevelopmentWarning[];
  /** Estimated completion of current milestone (0–100) */
  completionEstimate: CompletionEstimate;
  /** Risks present in the uncommitted working state */
  uncommittedRisks: UncommittedRisk[];
  /** Commit readiness: tri-state assessment (ready/almost_ready/not_ready) */
  commitReadiness: CommitReadiness;
  /** Readiness checklist items (TODO, FIXME, stub, validation) */
  commitChecklist: CommitChecklistItem[];
}

// ============================================================
// Pure Utility Functions
// ============================================================

/**
 * Derive a stable WorkingSet ID from a milestone identifier.
 * The ID is deterministic — same milestone always produces the same ID.
 *
 * @example createWorkingSetId("M12") → "ws-M12"
 */
export function createWorkingSetId(milestoneId: string): string {
  return `ws-${milestoneId}`;
}
