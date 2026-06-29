// ============================================================
// WhereAmI — i18n-aware milestone progress section.
// ============================================================

import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  data: DashboardRawData | null;
}

export function WhereAmI({ data }: Props) {
  const { t } = useTranslation();

  if (!data?.milestone) {
    return (
      <Section title={t.dashboard.whereAmI}>
        <p className="text-gray-600 text-sm">{t.dashboard.noTodo}</p>
      </Section>
    );
  }

  const m = data.milestone;

  return (
    <Section title={t.dashboard.whereAmI}>
      {/* Phase + Sprint */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-gray-400 text-sm">{m.phase}</span>
        <span className="text-gray-600">·</span>
        <span className="text-white font-medium">
          {t.dashboard.sprint} {m.currentSprint}: {m.sprints[m.currentSprint - 1]?.name ?? "—"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{t.dashboard.sprintsComplete.replace("{total}", String(m.totalSprints))}</span>
          <span>{m.progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${m.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sprint pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {m.sprints.map((s) => (
          <span
            key={s.number}
            className={`px-2 py-0.5 rounded text-xs ${
              s.completed
                ? "bg-green-900/40 text-green-400 border border-green-800"
                : s.number === m.currentSprint
                  ? "bg-blue-900/40 text-blue-400 border border-blue-800"
                  : "bg-gray-800 text-gray-600 border border-gray-700"
            }`}
          >
            {s.completed ? "✓" : s.number === m.currentSprint ? "●" : "○"} S{s.number}
          </span>
        ))}
      </div>

      {/* Baseline + branch + HEAD */}
      <div className="text-xs text-gray-600 space-y-0.5">
        <div>
          {t.dashboard.branch}:{" "}
          <span className="text-gray-400 font-mono">{m.branch}</span>
          {" · "}
          {t.dashboard.head}:{" "}
          <span className="text-gray-400 font-mono">{m.headCommit}</span>
        </div>
        <div>
          {t.dashboard.stableBaseline}:{" "}
          <span className="text-gray-400 font-mono">{m.baseline.tag}</span>
          <span className="text-gray-700 mx-1">({m.baseline.commit})</span>
          {m.baseline.commitsSince > 0 && (
            <span className="text-gray-500">
              {" "}— {t.dashboard.commitsSince.replace("{count}", String(m.baseline.commitsSince))}
            </span>
          )}
        </div>
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-850 rounded-lg border border-gray-700/50 p-5">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
