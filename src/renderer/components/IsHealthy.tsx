// ============================================================
// IsHealthy — Development Health from DevelopmentState (M13.5)
//
// Consumes DevelopmentState fields directly. No interpretation.
// No derivation. No business logic.
//
// Shows: completion %, warnings, commit readiness, risks.
// All values pre-computed by DevelopmentIntelligenceService.
// ============================================================

import { useTranslation } from "@/i18n/useTranslation";
import { Card, SectionHeader } from "./ui/base";

interface Props {
  /**
   * DevelopmentState from projectState.
   * When undefined, Development Intelligence is not yet available.
   */
  devState: DevelopmentState | undefined;
}

export function IsHealthy({ devState }: Props) {
  const { t } = useTranslation();

  if (!devState) {
    return (
      <Card>
        <SectionHeader title={t.dashboard.devHealth} />
        <p className="text-gray-600 text-sm">{t.dashboard.devHealthNotAvailable}</p>
      </Card>
    );
  }

  const ds = devState;
  const warnCount = ds.warnings.length;
  const errorCount = ds.warnings.filter((w) => w.severity === "error").length;
  const riskCount = ds.uncommittedRisks.length;
  const highRiskCount = ds.uncommittedRisks.filter((r) => r.severity === "high").length;

  // Tri-state commit readiness
  const readiness = ds.commitReadiness;
  const readinessLabel =
    readiness === "ready"
      ? t.dashboard.commitReady
      : readiness === "almost_ready"
        ? t.dashboard.commitAlmostReady
        : ds.workingSet.commitBlockerReason
          ? t.dashboard.commitNotReady.replace(
              "{reason}",
              ds.workingSet.commitBlockerReason ?? "unknown",
            )
          : t.dashboard.commitNotReady.replace("{reason}", "unknown");

  return (
    <Card>
      <SectionHeader title={t.dashboard.devHealth} />

      {/* Completion */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{t.dashboard.completion}</span>
          <span>{ds.completionEstimate.percentage}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${ds.completionEstimate.percentage}%` }}
          />
        </div>
        <div className="text-xs text-gray-600 mt-1">{ds.completionEstimate.label}</div>
      </div>

      {/* Warnings */}
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className={`w-4 text-center font-bold text-xs ${
          errorCount > 0 ? "text-red-400" : warnCount > 0 ? "text-yellow-400" : "text-green-400"
        }`}>
          {errorCount > 0 ? "✗" : warnCount > 0 ? "!" : "✓"}
        </span>
        <span className="text-gray-400">
          {t.dashboard.warningsCount
            .replace("{count}", String(warnCount))
            .replace("{plural}", warnCount !== 1 ? "s" : "")}
        </span>
        {errorCount > 0 && (
          <span className="text-red-400 text-xs">({errorCount} error{errorCount !== 1 ? "s" : ""})</span>
        )}
      </div>

      {/* Commit Readiness */}
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className={`w-4 text-center font-bold text-xs ${
          readiness === "ready" ? "text-green-400"
          : readiness === "almost_ready" ? "text-yellow-400"
          : "text-red-400"
        }`}>
          {readiness === "ready" ? "✓" : readiness === "almost_ready" ? "~" : "✗"}
        </span>
        <span className="text-gray-400">{t.dashboard.commitReadiness}</span>
        <span className={
          readiness === "ready" ? "text-green-400"
          : readiness === "almost_ready" ? "text-yellow-400"
          : "text-red-400"
        }>
          {readinessLabel}
        </span>
      </div>

      {/* Risks */}
      <div className="flex items-center gap-2 text-sm">
        <span className={`w-4 text-center font-bold text-xs ${
          highRiskCount > 0 ? "text-red-400" : riskCount > 0 ? "text-yellow-400" : "text-green-400"
        }`}>
          {highRiskCount > 0 ? "✗" : riskCount > 0 ? "!" : "✓"}
        </span>
        <span className="text-gray-400">
          {t.dashboard.risksCount
            .replace("{count}", String(riskCount))
            .replace("{plural}", riskCount !== 1 ? "s" : "")}
        </span>
        {highRiskCount > 0 && (
          <span className="text-red-400 text-xs">({highRiskCount} high)</span>
        )}
      </div>
    </Card>
  );
}
