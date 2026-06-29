// ============================================================
// IsHealthy — project health section.
// ============================================================

import { useDashboardStore, type DashboardBuildStatus } from "@/stores/dashboard";
import { useTranslation } from "@/i18n/useTranslation";
import { Card, SectionHeader } from "./ui/base";

interface Props { data: DashboardRawData | null; build: DashboardBuildStatus; }

export function IsHealthy({ data, build }: Props) {
  const { t } = useTranslation();
  const refreshBuild = useDashboardStore((s) => s.refreshBuild);
  const wt = data?.workingTree;
  const checksRun = build.typecheck !== "unknown" || build.build !== "unknown";

  return (
    <Card>
      <SectionHeader title={t.dashboard.isHealthy} />
      <div className="space-y-3">
        <StatusRow label={t.dashboard.workingTree} ok={wt?.isClean ?? false} okText={t.dashboard.clean}
          badText={wt ? t.dashboard.modifiedUntracked.replace("{modified}", String(wt.modified)).replace("{untracked}", String(wt.untracked)) : t.dashboard.unknown}
          detail={!wt?.isClean && wt ? wt.files.slice(0, 3).join(", ") + (wt.files.length > 3 ? ` +${wt.files.length - 3} more` : "") : undefined} />
        {checksRun ? (<>
          <StatusRow label={t.dashboard.typecheck} ok={build.typecheck === "pass"} okText={t.dashboard.passing} badText={t.dashboard.failing} />
          <StatusRow label={t.dashboard.build} ok={build.build === "pass"} okText={t.dashboard.passing} badText={t.dashboard.failing} />
          <button onClick={refreshBuild} className="text-xs text-blue-400 hover:text-blue-300 hover:underline">{t.dashboard.rerunChecks}</button>
        </>) : (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">{t.dashboard.checksNotRun}</span>
            <button onClick={refreshBuild} className="text-xs text-blue-400 hover:text-blue-300 hover:underline">{t.dashboard.runNow}</button>
          </div>
        )}
      </div>
    </Card>
  );
}

function StatusRow({ label, ok, okText, badText, detail }: { label: string; ok: boolean; okText: string; badText: string; detail?: string }) {
  const icon = ok ? "✓" : "!";
  const color = ok ? "text-green-400" : "text-yellow-400";
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`${color} w-4 text-center font-bold text-xs`}>{icon}</span>
      <span className="text-gray-400 w-28 shrink-0">{label}</span>
      <span className={color}>{ok ? okText : badText}</span>
      {detail && <span className="text-gray-600 text-xs truncate">{detail}</span>}
    </div>
  );
}
