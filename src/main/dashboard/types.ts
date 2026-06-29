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
