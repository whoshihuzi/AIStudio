/// <reference types="vite/client" />

declare module "*.css" {}

// Dashboard data types — mirror of src/main/dashboard/types.ts
// The Renderer only sees the shape, never the providers.
interface DashboardRawData {
  milestone: {
    phase: string;
    currentSprint: number;
    completedSprints: number;
    totalSprints: number;
    progressPercent: number;
    sprints: Array<{
      number: number;
      name: string;
      completed: boolean;
      totalTasks: number;
      completedTasks: number;
    }>;
    baseline: { tag: string; commit: string; commitsSince: number };
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
      create: (adapter: string) => Promise<{
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
      execute: (id: string, args?: Record<string, unknown>) => Promise<{
        success: boolean;
        commandId: string;
        error?: string;
        payload?: unknown;
      }>;
    };
  };
}
