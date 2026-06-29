// ============================================================
// Dashboard data types — shared between providers and service.
// The Renderer receives DashboardRawData via IPC but never
// knows which provider produced each piece.
// ============================================================

export interface SprintStatus {
  number: number;
  name: string;
  completed: boolean;
  totalTasks: number;
  completedTasks: number;
}

export interface MilestoneProgress {
  phase: string;
  currentSprint: number;
  completedSprints: number;
  totalSprints: number;
  progressPercent: number;
  sprints: SprintStatus[];
  baseline: {
    tag: string;
    commit: string;
    commitsSince: number;
  };
  branch: string;
  headCommit: string;
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

export interface DashboardRawData {
  milestone: MilestoneProgress | null;
  workingTree: WorkingTree | null;
  nextActions: NextAction[];
  recent: RecentActivity | null;
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
