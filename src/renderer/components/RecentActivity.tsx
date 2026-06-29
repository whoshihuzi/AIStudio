// ============================================================
// RecentActivity — collapsible, i18n-aware supporting context.
// ============================================================

import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  data: DashboardRawData | null;
}

export function RecentActivity({ data }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const commits = data?.recent?.commits ?? [];
  const sessions = data?.recent?.sessions ?? [];

  if (commits.length === 0 && sessions.length === 0) return null;

  return (
    <div className="bg-gray-850/50 rounded-lg border border-gray-700/30 p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 w-full text-left"
      >
        <span className="text-gray-500">{open ? "▼" : "▶"}</span>
        {t.dashboard.recentActivity
          .replace("{commits}", String(commits.length))
          .replace("{sessions}", String(sessions.length))}
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
          <div>
            <h3 className="text-gray-500 font-medium mb-1">{t.dashboard.gitLabel}</h3>
            <ul className="space-y-1">
              {commits.map((c, i) => (
                <li key={i} className="text-gray-600">
                  <span className="text-gray-500 font-mono">{c.hash}</span>{" "}
                  {c.subject}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-gray-500 font-medium mb-1">{t.dashboard.sessionsLabel}</h3>
            <ul className="space-y-1">
              {sessions.map((s, i) => (
                <li key={i} className="text-gray-600 truncate">
                  {s.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
