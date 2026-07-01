// ============================================================
// CurrentTask — first unchecked TODO.md task (M12.7).
//
// Reads pre-computed currentTask from ProjectState.
// No progress bar. No checklist. No aggregation.
// Widgets render, never derive.
// ============================================================

import { useTranslation } from "@/i18n/useTranslation";
import { Card, SectionHeader } from "./ui/base";

interface Props { data: ProjectState | null; }

export function CurrentTask({ data }: Props) {
  const { t } = useTranslation();
  const task = data?.currentTask;
  if (!task) return null;

  return (
    <Card>
      <SectionHeader title={t.dashboard.currentTask} />
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-white font-medium">{task.taskId}</span>
          <span className="text-gray-300 text-sm">{task.title}</span>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span>{task.sprint}</span>
          <span>{task.phase}</span>
        </div>
      </div>
    </Card>
  );
}
