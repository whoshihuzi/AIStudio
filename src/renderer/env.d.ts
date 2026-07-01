/// <reference types="vite/client" />

declare module "*.css" {}

// Dashboard data types — mirror of src/main/dashboard/types.ts
// The Renderer only sees the shape, never the providers.

// M12.6.6: ProjectState — single unified Dashboard payload
// Frozen architecture rule: widgets only render, never derive.
// M12.7: currentTask — first unchecked TODO.md task, pre-computed by DashboardService
interface ProjectState {
  currentTask: {
    taskId: string;
    title: string;
    sprint: string;
    phase: string;
  } | null;
  project: { projectName: string; workspacePath: string; branch: string; latestTag: string; headCommit: string; isClean: boolean };
  milestone: {
    phase: string;
    phaseLabel: string;
    currentMilestone: string;
    currentMilestoneName: string;
    milestoneProgress: string;
    milestoneTasks: Array<{
      id: string;
      description: string;
      completed: boolean;
    }>;
    baseline: { tag: string; commit: string; commitsSince: number; lastCommitTime: string };
    branch: string;
    headCommit: string;
  } | null;
  workingTree: {
    isClean: boolean;
    modified: number;
    untracked: number;
    files: string[];
  } | null;
  nextActions: Array<{
    priority: number;
    description: string;
    source: string;
  }>;
  brain: BrainData | null;
  build: { typecheck: "pass" | "fail" | "unknown"; build: "pass" | "fail" | "unknown" };
  recent: {
    commits: Array<{ hash: string; subject: string }>;
    sessions: Array<{ id: string; title: string }>;
  } | null;
  workspaceIndex?: {
    totalFiles: number;
    totalDirectories: number;
    lastIndexTime: number;
  };
  /** Pre-computed project status — widgets render, never derive */
  status: ProjectStatus;
  /** Development Intelligence state — composed from providers + pure engines (M13) */
  developmentState?: DevelopmentState;
  /** Pre-computed recommendation string (M13 stabilization) */
  recommendation?: string;
}

// ============================================================
// DevelopmentState — mirror of src/shared/development/types.ts
// Renderer only sees the shape, never the engines or providers.
// M13.5: used by IsHealthy, TodaysRecommendation, RecentActivity
// ============================================================

interface DevelopmentState {
  milestone: {
    id: string;
    name: string;
    phase: number;
    taskProgress: { completed: number; total: number };
    isActive: boolean;
  };
  sprint: {
    number: number;
    goal: string;
    isActive: boolean;
  };
  workingSet: {
    id: string;
    milestoneId: string;
    members: Array<{
      path: string;
      classification: "core" | "support" | "incidental" | "unknown";
      changeType: "modified" | "added" | "deleted" | "renamed" | "untracked";
      hasTestFile: boolean;
      hasDocFile: boolean;
    }>;
    phase: "forming" | "active" | "stabilizing" | "review" | "committed" | "abandoned";
    isCommitReady: boolean;
    commitBlockerReason: string | null;
    createdAt: number;
    lastModifiedAt: number;
  };
  workingSets: Array<{
    id: string;
    milestoneId: string;
    members: Array<{
      path: string;
      classification: "core" | "support" | "incidental" | "unknown";
      changeType: "modified" | "added" | "deleted" | "renamed" | "untracked";
      hasTestFile: boolean;
      hasDocFile: boolean;
    }>;
    phase: "forming" | "active" | "stabilizing" | "review" | "committed" | "abandoned";
    isCommitReady: boolean;
    commitBlockerReason: string | null;
    createdAt: number;
    lastModifiedAt: number;
  }>;
  changedFiles: Array<{
    path: string;
    changeType: "modified" | "added" | "deleted" | "renamed" | "untracked";
    associatedMilestone: string | null;
    workingSetId: string | null;
    staged: boolean;
  }>;
  relatedDocuments: Array<{
    sourcePath: string;
    docPath: string;
    relationship: "architecture" | "implementation-docs" | "changelog" | "todo" | "brain" | "principle" | "roadmap" | "logs";
    isModified: boolean;
  }>;
  suggestedCommitScope: {
    groups: Array<{
      suggestedMessage: string;
      files: string[];
      milestoneId: string;
      commitType: string;
    }>;
    orphanFiles: string[];
    likelyForgotten: string[];
    mixesMultipleMilestones: boolean;
  };
  warnings: Array<{
    severity: "info" | "warn" | "error";
    message: string;
    affectedFiles: string[];
    category: string;
  }>;
  completionEstimate: {
    percentage: number;
    tasks: { completed: number; total: number };
    files: { changed: number; estimated: number };
    label: string;
  };
  uncommittedRisks: Array<{
    description: string;
    severity: "low" | "medium" | "high";
    mitigation: string;
  }>;
  commitReadiness: "ready" | "almost_ready" | "not_ready";
  commitChecklist: Array<{
    label: string;
    passed: boolean;
    severity: "info" | "warn" | "error";
    category: "todo" | "fixme" | "stub" | "not-implemented" | "disabled" | "validation" | "milestone";
  }>;
}

/** Pre-computed health + recommendation. Computed ONCE by DashboardService. */
interface ProjectStatus {
  workingTree: {
    isClean: boolean;
    modified: number;
    untracked: number;
    files: string[];
  } | null;
  build: { typecheck: "pass" | "fail" | "unknown"; build: "pass" | "fail" | "unknown" };
  recommendationType: "dirty-tree" | "continue-milestone" | "ready-for-next";
  recommendationContext: string;
}

/**
 * @deprecated Use ProjectState instead. DashboardRawData is kept for
 * backward compatibility with legacy IPC callers. Will be removed
 * after full migration is verified.
 */
interface DashboardRawData {
  milestone: {
    phase: string;
    phaseLabel: string;
    currentMilestone: string;
    currentMilestoneName: string;
    milestoneProgress: string;
    milestoneTasks: Array<{
      id: string;
      description: string;
      completed: boolean;
    }>;
    baseline: { tag: string; commit: string; commitsSince: number; lastCommitTime: string };
    branch: string;
    headCommit: string;
  } | null;
  workingTree: {
    isClean: boolean;
    modified: number;
    untracked: number;
    files: string[];
  } | null;
  nextActions: Array<{
    priority: number;
    description: string;
    source: string;
  }>;
  recent: {
    commits: Array<{ hash: string; subject: string }>;
    sessions: Array<{ id: string; title: string }>;
  } | null;
  workspaceIndex?: {
    totalFiles: number;
    totalDirectories: number;
    lastIndexTime: number;
  };
}

interface BrainData {
  project: { name: string; description: string; createdAt: number; updatedAt: number; phase: string; version: string };
  architecture: {
    layers: Array<{ name: string; path: string; status: string }>;
    keyAbstractions: Array<{ name: string; file: string; description: string }>;
    updatedAt: number;
  };
  decisions: {
    decisions: Array<{ id: string; date: string; title: string; status: string; summary: string }>;
    updatedAt: number;
  };
  currentFocus: { milestone: string; sprint: string; goal: string; startedAt: number; updatedAt: number };
}

// Shared Resource Model — imported from src/shared/workspace/types.ts
// Duplicate definitions removed; use these interfaces directly.
interface WorkspaceNode { id: string; name: string; path: string; type: "file" | "directory"; }
interface FileNode extends WorkspaceNode { type: "file"; language?: string; size: number; modifiedAt: number; }
interface DirectoryNode extends WorkspaceNode { type: "directory"; children?: WorkspaceNode[]; }
interface WorkspaceSelection { nodes: WorkspaceNode[]; anchor?: WorkspaceNode; }
interface WorkspaceChange { path: string; type: "created" | "modified" | "deleted" | "renamed"; oldPath?: string; timestamp: number; }
interface WorkspaceMetadata { root: string; totalFiles: number; totalDirectories: number; languageBreakdown: Record<string, number>; }

// Preload API exposed via contextBridge
interface Window {
  api: {
    agent: {
      send: (prompt: string, sessionId?: string) => void;
      abort: () => void;
      onEvent: (
        callback: (event: {
          type: string;
          content?: string;
          toolName?: string;
          input?: unknown;
          output?: string;
          error?: string;
        }) => void,
      ) => () => void;
    };
    session: {
      create: (adapter?: string) => Promise<{
        id: string;
        title: string;
        runtime: string;
        adapter: string;
        createdAt: number;
        updatedAt: number;
      }>;
      list: () => Promise<
        Array<{
          id: string;
          title: string;
          runtime: string;
          adapter: string;
          createdAt: number;
          updatedAt: number;
        }>
      >;
      load: (id: string) => Promise<{
        meta: {
          id: string;
          title: string;
          runtime: string;
          adapter: string;
          createdAt: number;
          updatedAt: number;
        };
        messages: Array<{
          id: string;
          role: "user" | "assistant" | "system";
          parts: Array<{
            type: string;
            content?: string;
            language?: string;
            toolName?: string;
            input?: unknown;
            output?: string;
            status?: string;
          }>;
          timestamp: number;
        }>;
      } | null>;
      save: (data: {
        meta: {
          id: string;
          title: string;
          runtime: string;
          adapter: string;
          createdAt: number;
          updatedAt: number;
        };
        messages: Array<{
          id: string;
          role: "user" | "assistant" | "system";
          parts: Array<{
            type: string;
            content?: string;
            language?: string;
            toolName?: string;
            input?: unknown;
            output?: string;
            status?: string;
          }>;
          timestamp: number;
        }>;
      }) => Promise<void>;
      delete: (id: string) => Promise<void>;
      /** Main → Renderer: "about to quit, flush now" */
      onFlushRequest: (callback: () => void) => () => void;
      /** Renderer → Main: "flush done, you can close" */
      flushComplete: () => void;
    };
    dashboard: {
      getData: () => Promise<DashboardRawData>;
      runChecks: () => Promise<{ typecheck: string; build: string }>;
    };
    project: {
      getInfo: () => Promise<{
        projectName: string; workspacePath: string; branch: string;
        latestTag: string; headCommit: string; isClean: boolean;
      }>;
    };
    brain: {
      getData: () => Promise<BrainData>;
    };
    workspace: {
      list: (path: string) => Promise<WorkspaceNode[]>;
      stat: (path: string) => Promise<FileNode>;
      read: (path: string) => Promise<{ node: FileNode; content: string }>;
      exists: (path: string) => Promise<boolean>;
      write: (path: string, content: string) => Promise<void>;
      rename: (from: string, to: string) => Promise<void>;
      mkdir: (path: string) => Promise<void>;
      delete: (path: string) => Promise<void>;
      copy: (from: string, to: string) => Promise<void>;
      move: (from: string, to: string) => Promise<void>;
    };
    config: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<void>;
      onLanguageChange: (callback: (locale: string) => void) => () => void;
    };
    command: {
      list: () => Promise<
        Array<{
          id: string;
          title: string;
          description: string;
          category: string;
          keywords: string[];
          shortcut?: string;
        }>
      >;
      execute: (id: string, args?: Record<string, unknown>) => Promise<{
        success: boolean;
        commandId: string;
        error?: string;
        payload?: unknown;
      }>;
    };
  };
}
