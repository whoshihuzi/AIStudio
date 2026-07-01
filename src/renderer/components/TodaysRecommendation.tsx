// ============================================================
// TodaysRecommendation — Renders pre-computed recommendation.
//
// M13 stabilization: receives pre-computed recommendation
// string from the engine (ProjectActivity.nextAction or
// DashboardService). No derivation. No business logic.
// ============================================================

import { useTranslation } from "@/i18n/useTranslation";
import { Card, SectionHeader } from "./ui/base";

interface Props {
  /** Pre-computed recommendation string from engine */
  recommendation: string;
}

export function TodaysRecommendation({ recommendation }: Props) {
  const { t } = useTranslation();

  if (!recommendation) {
    return (
      <Card>
        <SectionHeader title={t.dashboard.devRecommendation} />
        <p className="text-gray-600 text-sm">{t.dashboard.devRecNotAvailable}</p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader title={t.dashboard.devRecommendation} />
      <p className="text-sm text-blue-300">{recommendation}</p>
    </Card>
  );
}
