// ============================================================
// DashboardHeader — project identity bar + global activity.
// Shows: project name, path, branch, tag, HEAD, clean/dirty,
// language, refresh button, and current activity state.
// ============================================================

import { useTranslation } from "@/i18n/useTranslation";
import { useDashboardStore } from "@/stores/dashboard";
import { useLanguage } from "@/i18n/LanguageProvider";

export function DashboardHeader() {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const projectState = useDashboardStore((s) => s.projectState);
  const info = projectState?.project;
  const activity = useDashboardStore((s) => s.activity);
  const refresh = useDashboardStore((s) => s.refresh);

  if (!info) return null;

  const langLabel = locale === "zh-CN" ? "中文" : "EN";
  const activityLabels: Record<string, string> = {
    idle: "",
    refreshing: "Refreshing...",
    "running-checks": "Running checks...",
    building: "Building...",
    typechecking: "Typechecking...",
  };

  return (
    <div className="bg-gray-850 border-b border-gray-700 px-6 py-2">
      {/* Row 1: identity */}
      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        <span className="text-gray-300 font-medium">{info.projectName}</span>
        <span className="text-gray-700">·</span>
        <span className="text-gray-600 font-mono truncate max-w-[200px]" title={info.workspacePath}>
          {info.workspacePath}
        </span>
        <span className="text-gray-700">·</span>
        <span className="text-gray-500 font-mono">{info.branch}</span>
        <span className="text-gray-700">·</span>
        <span className="text-gray-500 font-mono">{info.latestTag}</span>
        <span className="text-gray-700">·</span>
        <span className="text-gray-600 font-mono">{info.headCommit}</span>
        <span className="text-gray-700">·</span>
        <span className={info.isClean ? "text-green-500" : "text-yellow-400"}>
          {info.isClean ? t.dashboard.clean : "Dirty"}
        </span>
        <span className="ml-auto text-gray-600">{langLabel}</span>
        <button
          onClick={refresh}
          className="text-blue-400 hover:text-blue-300 hover:underline"
        >
          ↻
        </button>
      </div>

      {/* Row 2: activity (only when active) */}
      {activity !== "idle" && (
        <div className="text-xs text-blue-400 mt-1 animate-pulse">
          {activityLabels[activity] ?? activity}
        </div>
      )}
    </div>
  );
}
