// ============================================================
// RecentActivity — Development Activity from DevelopmentState.
//
// M13.5: shows changed files and related documents from
// DevelopmentState. Collapsible, no derivation, no interpretation.
// ============================================================

import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  /** DevelopmentState from projectState. Undefined → not yet available. */
  devState: DevelopmentState | undefined;
}

export function RecentActivity({ devState }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!devState) return null;

  const changedFiles = devState.changedFiles;
  const relatedDocs = devState.relatedDocuments;

  if (changedFiles.length === 0 && relatedDocs.length === 0) {
    return (
      <div className="bg-gray-850/50 rounded-lg border border-gray-700/30 p-4">
        <p className="text-xs text-gray-600">{t.dashboard.noChanges}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-850/50 rounded-lg border border-gray-700/30 p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 w-full text-left"
      >
        <span className="text-gray-500">{open ? "▼" : "▶"}</span>
        {t.dashboard.devActivity}
        <span className="text-gray-500 ml-1">
          ({changedFiles.length} {t.dashboard.changedFiles.toLowerCase()}
          {relatedDocs.length > 0
            ? `, ${relatedDocs.length} ${t.dashboard.relatedDocs.toLowerCase()}`
            : ""}
          )
        </span>
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
          {/* Changed Files */}
          <div>
            <h3 className="text-gray-500 font-medium mb-1">
              {t.dashboard.changedFiles} ({changedFiles.length})
            </h3>
            <ul className="space-y-1">
              {changedFiles.slice(0, 20).map((f, i) => (
                <li key={i} className="text-gray-600 font-mono truncate" title={f.path}>
                  <span className="text-gray-500 mr-1">{changeTypeSymbol(f.changeType)}</span>
                  {f.path}
                </li>
              ))}
              {changedFiles.length > 20 && (
                <li className="text-gray-600">
                  ...and {changedFiles.length - 20} more
                </li>
              )}
            </ul>
          </div>
          {/* Related Documents */}
          <div>
            <h3 className="text-gray-500 font-medium mb-1">
              {t.dashboard.relatedDocs} ({relatedDocs.length})
            </h3>
            {relatedDocs.length > 0 ? (
              <ul className="space-y-1">
                {relatedDocs.slice(0, 10).map((d, i) => (
                  <li key={i} className="text-gray-600 truncate" title={`${d.sourcePath} → ${d.docPath}`}>
                    <span className="text-gray-500 font-mono text-[10px]">{d.relationship}</span>
                    {" "}
                    <span className="text-gray-600 font-mono">{d.docPath}</span>
                  </li>
                ))}
                {relatedDocs.length > 10 && (
                  <li className="text-gray-600">
                    ...and {relatedDocs.length - 10} more
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-gray-600">—</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function changeTypeSymbol(ct: string): string {
  switch (ct) {
    case "modified": return "M";
    case "added": return "A";
    case "deleted": return "D";
    case "renamed": return "R";
    case "untracked": return "?";
    default: return " ";
  }
}
