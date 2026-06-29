// ============================================================
// DashboardStore — Zustand store for Dashboard data.
//
// The Renderer does NOT know where data comes from (Git, docs,
// sessions, build). It only calls window.api.dashboard.getData()
// and window.api.dashboard.runChecks().
// ============================================================

import { create } from "zustand";

export interface DashboardBuildStatus {
  typecheck: "pass" | "fail" | "unknown";
  build: "pass" | "fail" | "unknown";
}

export interface DashboardState {
  data: DashboardRawData | null;
  build: DashboardBuildStatus;
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  refreshBuild: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  build: { typecheck: "unknown", build: "unknown" },
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const data = await window.api.dashboard.getData();
      set({ data, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  refreshBuild: async () => {
    set({ build: { typecheck: "unknown", build: "unknown" } });
    try {
      const result = await window.api.dashboard.runChecks();
      set({
        build: {
          typecheck: result.typecheck as "pass" | "fail",
          build: result.build as "pass" | "fail",
        },
      });
    } catch (err) {
      set({ build: { typecheck: "fail", build: "fail" } });
    }
  },
}));
