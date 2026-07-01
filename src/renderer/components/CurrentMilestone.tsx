// ============================================================
// MilestoneProgress — shows current Phase and Milestone.
// (M12.7: renamed from CurrentMilestone — IA correction)
// ============================================================

import { useTranslation } from "@/i18n/useTranslation";
import { Card, SectionHeader, Badge } from "./ui/base";

interface Props { data: ProjectState | null; }

export function MilestoneProgress({ data }: Props) {
  const { t } = useTranslation();

  if (!data?.milestone) {
    return <Card><SectionHeader title={t.dashboard.milestoneProgress} /><p className="text-gray-600 text-sm">{t.dashboard.noTodo}</p></Card>;
  }

  const m = data.milestone;

  return (
    <Card>
      <SectionHeader title={t.dashboard.milestoneProgress} />
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">{m.phaseLabel}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-white font-medium text-lg">{m.currentMilestone}</span>
          <span className="text-gray-400 text-sm">{m.currentMilestoneName}</span>
        </div>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{m.milestoneProgress}</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          {m.milestoneTasks.length > 0 ? (
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((m.milestoneTasks.filter(t => t.completed).length / m.milestoneTasks.length) * 100)}%`,
              }}
            />
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {m.milestoneTasks.map((task) => (
          <Badge key={task.id} variant={task.completed ? "success" : "info"}>
            {task.completed ? "✓" : "●"} {task.id}
          </Badge>
        ))}
      </div>
      <div className="text-xs text-gray-600 space-y-0.5">
        <div>
          {t.dashboard.branch}: <span className="text-gray-400 font-mono">{m.branch}</span>
          {" · "}{t.dashboard.head}: <span className="text-gray-400 font-mono">{m.headCommit}</span>
        </div>
        <div>
          {t.dashboard.stableBaseline}: <span className="text-gray-400 font-mono">{m.baseline.tag}</span>
          <span className="text-gray-700 mx-1">({m.baseline.commit})</span>
          {m.baseline.commitsSince > 0 && <span className="text-gray-500"> — {t.dashboard.commitsSince.replace("{count}", String(m.baseline.commitsSince))}</span>}
        </div>
        <div>
          {t.dashboard.lastCommit}: <span className="text-gray-400">{m.baseline.lastCommitTime}</span>
        </div>
      </div>
    </Card>
  );
}
