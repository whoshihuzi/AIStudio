// ============================================================
// DashboardStore — Zustand store for Dashboard data.
// Activity state is the single global indicator — no component
// maintains its own loading flag.
// ============================================================

import { create } from "zustand";

export interface DashboardBuildStatus {
  typecheck: "pass" | "fail" | "unknown";
  build: "pass" | "fail" | "unknown";
}

export type ActivityState =
  | "idle"
  | "refreshing"
  | "running-checks"
  | "building"
  | "typechecking";

export interface ProjectInfo {
  projectName: string;
  workspacePath: string;
  branch: string;
  latestTag: string;
  headCommit: string;
  isClean: boolean;
}

export interface DashboardState {
  data: DashboardRawData | null;
  build: DashboardBuildStatus;
  projectInfo: ProjectInfo | null;
  brainData: BrainData | null;
  activity: ActivityState;
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  refreshBuild: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  data: null,
  build: { typecheck: "unknown", build: "unknown" },
  projectInfo: null,
  brainData: null,
  activity: "idle",
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, activity: "refreshing", error: null });
    try {
      const result = await window.api.command.execute("dashboard.refresh");
      if (!result.success) {
        throw new Error(result.error ?? "Unknown error");
      }
      const payload = result.payload as {
        data: DashboardRawData;
        projectInfo: ProjectInfo;
        brainData: BrainData;
      };
      set({
        data: payload.data,
        projectInfo: payload.projectInfo,
        brainData: payload.brainData,
        loading: false,
        activity: "idle",
      });
    } catch (err) {
      set({ error: String(err), loading: false, activity: "idle" });
    }
  },

  refreshBuild: async () => {
    set({ build: { typecheck: "unknown", build: "unknown" }, activity: "running-checks" });
    try {
      const result = await window.api.command.execute("runtime.runChecks");
      if (!result.success) {
        throw new Error(result.error ?? "Unknown error");
      }
      const payload = result.payload as { typecheck: string; build: string };
      set({
        build: {
          typecheck: payload.typecheck as "pass" | "fail",
          build: payload.build as "pass" | "fail",
        },
        activity: "idle",
      });
    } catch (err) {
      set({ build: { typecheck: "fail", build: "fail" }, activity: "idle" });
    }
  },
}));
