// ============================================================
// WorkspaceWidget — workspace index metadata.
// All data from WorkspaceIndexStore; no disk scanning.
// ============================================================

import { useTranslation } from "@/i18n/useTranslation";
import { Card, SectionHeader } from "./ui/base";

interface Props { data: ProjectState | null; }

export function WorkspaceWidget({ data }: Props) {
  const { t } = useTranslation();
  const ws = data?.workspaceIndex;

  return (
    <Card>
      <SectionHeader title={t.dashboard.workspace} />
      {ws ? (
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t.dashboard.indexedFiles}</span>
            <span className="text-gray-300 font-mono">{ws.totalFiles.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.dashboard.indexedDirs}</span>
            <span className="text-gray-300 font-mono">{ws.totalDirectories.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.dashboard.lastIndex}</span>
            <span className="text-gray-600 text-xs">
              {ws.lastIndexTime > 0 ? new Date(ws.lastIndexTime).toLocaleTimeString() : "—"}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-gray-600 text-sm">Index not yet built.</p>
      )}
    </Card>
  );
}
