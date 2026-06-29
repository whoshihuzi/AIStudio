// ============================================================
// ProjectBrain — read-only widget showing current AI context.
// Data from workspace/brain/ via BrainProvider.
// ============================================================

import { useDashboardStore } from "@/stores/dashboard";
import { useTranslation } from "@/i18n/useTranslation";

export function ProjectBrain() {
  const { t } = useTranslation();
  const brain = useDashboardStore((s) => s.brainData);

  if (!brain) return null;

  const fmt = (ts: number) => new Date(ts).toLocaleDateString();

  return (
    <div className="bg-gray-850 rounded-lg border border-gray-700/50 p-5">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {t.dashboard.projectBrain}
      </h2>

      {/* Current Focus */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1">{t.dashboard.currentFocus}</div>
        <div className="text-sm text-gray-300">{brain.currentFocus.milestone}</div>
        <div className="text-xs text-gray-500">
          {brain.currentFocus.sprint} — {brain.currentFocus.goal}
        </div>
        <div className="text-xs text-gray-700 mt-1">
          {t.dashboard.lastUpdated}: {fmt(brain.currentFocus.updatedAt)}
        </div>
      </div>

      {/* Project summary */}
      <div className="border-t border-gray-700/30 pt-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">{brain.project.phase}</span>
          <span className="text-gray-500 font-mono">v{brain.project.version}</span>
        </div>
        <div className="text-xs text-gray-500">
          {brain.decisions.decisions.length} {t.dashboard.decisionsLabel},{" "}
          {brain.architecture.layers.length} {t.dashboard.layersLabel}
        </div>
      </div>
    </div>
  );
}
