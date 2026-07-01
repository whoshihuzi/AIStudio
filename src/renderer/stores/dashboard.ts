// ============================================================
// DashboardStore — Zustand store for Dashboard data.
//
// M12.6.6: receives a single projectState object from
// dashboard.refresh instead of separate data/projectInfo/brainData.
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

export interface DashboardState {
  // M12.6.6: unified project state
  projectState: ProjectState | null;
  build: DashboardBuildStatus;
  activity: ActivityState;
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  refreshBuild: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  projectState: null,
  build: { typecheck: "unknown", build: "unknown" },
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
        projectState: ProjectState;
      };
      set({
        projectState: payload.projectState,
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
