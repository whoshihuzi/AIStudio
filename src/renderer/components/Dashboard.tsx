// ============================================================
// Dashboard — Mission Control layout.
// Sections: Project | Workspace | Development Intelligence
//
// M12.6.6: renders from single projectState object.
// M13.5: Health/Recommendation/Activity consume DevelopmentState
//   directly — no business logic, no interpretation.
// ============================================================

import { useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboard";
import { useTranslation } from "@/i18n/useTranslation";
import { DashboardHeader } from "./DashboardHeader";
import { ProjectBrain } from "./ProjectBrain";
import { MilestoneProgress } from "./CurrentMilestone";
import { CurrentTask } from "./CurrentTask";
import { IsHealthy } from "./IsHealthy";
import { TodaysRecommendation } from "./TodaysRecommendation";
import { WorkspaceWidget } from "./WorkspaceWidget";
import { RecentActivity } from "./RecentActivity";

export function Dashboard() {
  const { t } = useTranslation();
  const projectState = useDashboardStore((s) => s.projectState);
  const loading = useDashboardStore((s) => s.loading);
  const error = useDashboardStore((s) => s.error);
  const refresh = useDashboardStore((s) => s.refresh);

  useEffect(() => {
    refresh();
  }, []);

  if (loading && !projectState) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <p className="text-gray-500 text-sm">{t.dashboard.loading}</p>
      </div>
    );
  }

  if (error && !projectState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 gap-3">
        <p className="text-yellow-400 text-sm">{t.dashboard.failed}</p>
        <p className="text-gray-600 text-xs">{error}</p>
        <button
          onClick={refresh}
          className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
        >
          {t.dashboard.retry}
        </button>
      </div>
    );
  }

  // Extract developmentState once — all dev-intel widgets consume it
  const devState = projectState?.developmentState;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gray-900">
      <DashboardHeader />
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6 w-full">

        {/* ──────── ProjectState widgets ──────── */}
        <CurrentTask data={projectState} />
        <MilestoneProgress data={projectState} />
        <WorkspaceWidget data={projectState} />
        <ProjectBrain />

        {/* ──────── DevelopmentState widgets ──────── */}
        <IsHealthy devState={devState} />
        <TodaysRecommendation recommendation={projectState?.recommendation ?? ""} />
        <RecentActivity devState={devState} />
      </div>
    </div>
  );
}
