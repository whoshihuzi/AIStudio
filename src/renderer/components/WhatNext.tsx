// ============================================================
// WhatNext — prioritized actions.
// ============================================================

import { useTranslation } from "@/i18n/useTranslation";
import { Card, SectionHeader } from "./ui/base";

interface Props { data: DashboardRawData | null; }

export function WhatNext({ data }: Props) {
  const { t } = useTranslation();
  const wt = data?.workingTree;
  const actions: Array<{ priority: number; description: string; source: string }> = [];

  if (wt && !wt.isClean) {
    actions.push({ priority: 0, description: t.dashboard.dirtyAction.replace("{count}", String(wt.modified + wt.untracked)), source: t.dashboard.sourceGit });
  }
  for (const a of data?.nextActions ?? []) actions.push({ ...a });
  actions.forEach((a, i) => { a.priority = i + 1; });

  return (
    <Card>
      <SectionHeader title={t.dashboard.whatNext} />
      {actions.length === 0 ? (
        <p className="text-green-400 text-sm">{t.dashboard.allCompleteClean}</p>
      ) : (
        <ul className="space-y-2">
          {actions.map((a, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className={`font-mono text-xs mt-0.5 shrink-0 ${a.source === t.dashboard.sourceGit ? "text-yellow-400" : "text-blue-400"}`}>#{a.priority}</span>
              <span className={a.source === t.dashboard.sourceGit ? "text-yellow-300" : "text-gray-300"}>{a.description}</span>
              <span className="text-gray-700 text-xs shrink-0 ml-auto">{a.source}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
