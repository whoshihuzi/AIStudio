// ============================================================
// Dashboard — answers three questions using i18n translations.
// ============================================================

import { useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboard";
import { useTranslation } from "@/i18n/useTranslation";
import { WhereAmI } from "./WhereAmI";
import { IsHealthy } from "./IsHealthy";
import { WhatNext } from "./WhatNext";
import { RecentActivity } from "./RecentActivity";

export function Dashboard() {
  const { t } = useTranslation();
  const data = useDashboardStore((s) => s.data);
  const build = useDashboardStore((s) => s.build);
  const loading = useDashboardStore((s) => s.loading);
  const error = useDashboardStore((s) => s.error);
  const refresh = useDashboardStore((s) => s.refresh);

  useEffect(() => {
    refresh();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <p className="text-gray-500 text-sm">{t.dashboard.loading}</p>
      </div>
    );
  }

  if (error && !data) {
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

  return (
    <div className="flex-1 overflow-y-auto bg-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <WhereAmI data={data} />
        <IsHealthy data={data} build={build} />
        <WhatNext data={data} />
        <RecentActivity data={data} />
      </div>
    </div>
  );
}
