// ============================================================
// Dashboard data types — shared between providers and service.
// The Renderer receives DashboardRawData via IPC but never
// knows which provider produced each piece.
// ============================================================

import type { DevelopmentState } from "../../shared/development/types.js";

export interface MilestoneProgress {
  phase: string;
  /** e.g. "Phase 3 — Workspace Intelligence" */
  phaseLabel: string;
  /** e.g. "M12" */
  currentMilestone: string;
  /** e.g. "Editor Foundation" */
  currentMilestoneName: string;
  /** e.g. "3 of 8 tasks" or "2 of 5 complete" */
  milestoneProgress: string;
  /** Tasks in the current milestone group */
  milestoneTasks: MilestoneTask[];
  baseline: {
    tag: string;
    commit: string;
    commitsSince: number;
    lastCommitTime: string;
  };
  branch: string;
  headCommit: string;
}

export interface MilestoneTask {
  id: string;
  description: string;
  completed: boolean;
}

export interface WorkingTree {
  isClean: boolean;
  modified: number;
  untracked: number;
  files: string[];
}

export interface NextAction {
  priority: number;
  description: string;
  source: "TODO.md" | "git" | "docs";
}

export interface BuildStatus {
  typecheck: "pass" | "fail" | "unknown";
  build: "pass" | "fail" | "unknown";
}

export interface RecentActivity {
  commits: Array<{ hash: string; subject: string }>;
  sessions: Array<{ id: string; title: string }>;
}

/**
 * @deprecated Use ProjectState instead. DashboardRawData is kept for
 * backward compatibility with legacy callers (ValidationProvider,
 * DashboardService.getData()). Will be removed after full migration
 * is verified.
 */
export interface DashboardRawData {
  milestone: MilestoneProgress | null;
  workingTree: WorkingTree | null;
  nextActions: NextAction[];
  recent: RecentActivity | null;
  /** Workspace metadata from index (Task 6) */
  workspaceIndex?: WorkspaceIndexSnapshot;
}

// ============================================================
// Workspace Index — snapshot for Dashboard (Task 6)
// ============================================================

export interface WorkspaceIndexSnapshot {
  totalFiles: number;
  totalDirectories: number;
  lastIndexTime: number;
}

// ============================================================
// Project Identity — workspace identity + git snapshot
// ============================================================

export interface ProjectInfo {
  projectName: string;
  workspacePath: string;
  branch: string;
  latestTag: string;
  headCommit: string;
  isClean: boolean;
}

// ============================================================
// Activity State — global loading indicator
// ============================================================

export type ActivityState =
  | "idle"
  | "refreshing"
  | "running-checks"
  | "building"
  | "typechecking";

// ============================================================
// Project Brain — long-term AI context (workspace/brain/)
// ============================================================

export interface BrainProject {
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  phase: string;
  version: string;
}

export interface BrainArchitecture {
  layers: Array<{
    name: string;
    path: string;
    status: "stable" | "evolving" | "planned";
  }>;
  keyAbstractions: Array<{
    name: string;
    file: string;
    description: string;
  }>;
  updatedAt: number;
}

export interface BrainDecision {
  id: string;
  date: string;
  title: string;
  status: "accepted" | "proposed" | "superseded";
  summary: string;
}

export interface BrainDecisions {
  decisions: BrainDecision[];
  updatedAt: number;
}

export interface BrainCurrentFocus {
  milestone: string;
  sprint: string;
  goal: string;
  startedAt: number;
  updatedAt: number;
}

export interface BrainData {
  project: BrainProject;
  architecture: BrainArchitecture;
  decisions: BrainDecisions;
  currentFocus: BrainCurrentFocus;
}

// ============================================================
// CurrentTask — first unchecked task (M12.7)
//
// Pre-computed by DashboardService from milestone + brain.
// Widget renders, never derives.
// ============================================================

export interface CurrentTask {
  taskId: string;        // "M11e"
  title: string;         // "Command Palette UI (Ctrl+P)"
  sprint: string;        // "Sprint 4"
  phase: string;         // "Phase 3"
}

// ============================================================
// ProjectState — single unified Dashboard payload (M12.6.6)
//
// Dashboard renders from ONE object instead of assembling
// multiple unrelated values. DashboardService composes this
// from existing providers. No new Provider. No new IPC.
//
// Frozen architecture rule: ProjectState is composed ONLY by
// DashboardService. Providers own only their own domains.
// Widgets never derive ProjectState — they only render it.
// ============================================================

export interface ProjectState {
  /** Current task: first unchecked TODO.md task (M12.7) */
  currentTask: CurrentTask | null;
  /** Git identity + workspace snapshot */
  project: ProjectInfo;
  /** Mission Control: current milestone from TODO.md */
  milestone: MilestoneProgress | null;
  /** Working tree status */
  workingTree: WorkingTree | null;
  /** Priority-ordered next actions from TODO.md */
  nextActions: NextAction[];
  /** Project Brain: long-term AI context */
  brain: BrainData | null;
  /** Build health (typecheck + build) */
  build: BuildStatus;
  /** Recent activity (commits + sessions) */
  recent: RecentActivity | null;
  /** Workspace index snapshot (optional) */
  workspaceIndex?: WorkspaceIndexSnapshot;
  /** Pre-computed project status — widgets render, never derive */
  status: ProjectStatus;
  /** Development Intelligence state — composed from providers + pure engines */
  developmentState?: DevelopmentState;
  /** Pre-computed recommendation string (M13: actionable, specific) */
  recommendation?: string;
}

// ============================================================
// ProjectStatus — pre-computed health + recommendation.
//
// Computed ONCE by DashboardService. Widgets read from this
// and NEVER recompose or reinterpret status from raw fields.
// ============================================================

export type RecommendationType = "dirty-tree" | "continue-milestone" | "ready-for-next";

export interface ProjectStatus {
  /** Working tree status snapshot */
  workingTree: WorkingTree | null;
  /** Build health */
  build: BuildStatus;
  /** Pre-computed recommendation type — widget maps to i18n, no logic */
  recommendationType: RecommendationType;
  /** Milestone identifier for "continue-milestone" recommendations */
  recommendationContext: string;
}

// ============================================================
// Validation — internal, never exposed to Renderer
// ============================================================

export type ValidationStatus = "pass" | "fail" | "warn";

export interface ValidationEntry {
  field: string;            // e.g. "workingTree.isClean"
  status: ValidationStatus;
  expected: string;         // what independent check found
  actual: string;           // what the Provider returned
  message: string;          // human-readable explanation
}

export interface ValidationReport {
  timestamp: number;
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  entries: ValidationEntry[];
  /** Reserved for future Dashboard Health Score (0-100). */
  healthScore?: number;
}
