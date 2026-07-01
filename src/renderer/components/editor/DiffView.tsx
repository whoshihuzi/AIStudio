// ============================================================
// DiffView — renders DiffHunk[] as a unified diff.
//
// Pure presentational component. No store access.
// Receives DiffResult and renders colored hunks.
// ============================================================

import type { DiffHunk, DiffLine, DiffResult } from "@shared/editor/diff";

export interface DiffViewProps {
  diffResult: DiffResult;
  /** When set, shows Accept/Reject buttons per hunk. */
  interactive?: boolean;
  onAcceptHunk?: (hunkIndex: number) => void;
  onRejectHunk?: (hunkIndex: number) => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  /** List of hunk indices currently being processed. */
  processingHunks?: Set<number>;
}

const LINE_STYLE: Record<DiffLine["type"], string> = {
  added: "bg-green-950/60 text-green-300 border-l-2 border-green-600",
  removed: "bg-red-950/60 text-red-300 border-l-2 border-red-600",
  unchanged: "text-gray-400 border-l-2 border-gray-800",
};

const LINE_PREFIX: Record<DiffLine["type"], string> = {
  added: "+",
  removed: "-",
  unchanged: " ",
};

export function DiffView({
  diffResult,
  interactive = false,
  onAcceptHunk,
  onRejectHunk,
  onAcceptAll,
  onRejectAll,
  processingHunks,
}: DiffViewProps) {
  const { hunks, path } = diffResult;

  if (hunks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
        No changes — file content matches disk.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-950">
      {/* ── Diff Header ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400 font-mono truncate max-w-[300px]">
            {path}
          </span>
          <span className="text-gray-600">
            {hunks.length} {hunks.length === 1 ? "hunk" : "hunks"}
          </span>
        </div>
        {interactive && onAcceptAll && onRejectAll && (
          <div className="flex items-center gap-2">
            <button
              onClick={onRejectAll}
              className="text-xs px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded"
              title="Reject all changes"
            >
              Reject All
            </button>
            <button
              onClick={onAcceptAll}
              className="text-xs px-2 py-1 text-green-400 hover:text-green-300 hover:bg-green-950/40 rounded"
              title="Accept all changes"
            >
              Accept All
            </button>
          </div>
        )}
      </div>

      {/* ── Diff Hunks ── */}
      <div className="flex-1 overflow-y-auto font-mono text-xs leading-5">
        {hunks.map((hunk, hi) => (
          <HunkBlock
            key={hi}
            hunk={hunk}
            hunkIndex={hi}
            interactive={interactive}
            onAccept={onAcceptHunk}
            onReject={onRejectHunk}
            processing={processingHunks?.has(hi)}
          />
        ))}
      </div>
    </div>
  );
}

function HunkBlock({
  hunk,
  hunkIndex,
  interactive,
  onAccept,
  onReject,
  processing,
}: {
  hunk: DiffHunk;
  hunkIndex: number;
  interactive: boolean;
  onAccept?: (hunkIndex: number) => void;
  onReject?: (hunkIndex: number) => void;
  processing?: boolean;
}) {
  return (
    <div className="border-b border-gray-800/50">
      {/* ── Hunk Header ── */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-900/50 border-b border-gray-800/30">
        <span className="text-xs text-cyan-600 font-mono">
          @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
          {hunk.heading ? ` ${hunk.heading}` : ""}
        </span>
        {interactive && onAccept && onReject && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onReject(hunkIndex)}
              disabled={processing}
              className="text-xs px-1.5 py-0.5 text-red-500 hover:text-red-400 hover:bg-red-950/40 rounded disabled:opacity-40"
              title="Reject this hunk"
            >
              ✗
            </button>
            <button
              onClick={() => onAccept(hunkIndex)}
              disabled={processing}
              className="text-xs px-1.5 py-0.5 text-green-500 hover:text-green-400 hover:bg-green-950/40 rounded disabled:opacity-40"
              title="Accept this hunk"
            >
              ✓
            </button>
          </div>
        )}
      </div>

      {/* ── Hunk Lines ── */}
      {hunk.lines.map((line, li) => (
        <div
          key={li}
          className={`flex ${LINE_STYLE[line.type]} px-2 py-0`}
        >
          <span className="w-12 shrink-0 text-right pr-2 text-gray-600 select-none tabular-nums">
            {line.type === "added" ? "" : line.oldLineNumber}
          </span>
          <span className="w-12 shrink-0 text-right pr-2 text-gray-600 select-none tabular-nums">
            {line.type === "removed" ? "" : line.newLineNumber}
          </span>
          <span className="w-4 shrink-0 text-center select-none">
            {LINE_PREFIX[line.type]}
          </span>
          <span className="whitespace-pre-wrap break-all">{line.content}</span>
        </div>
      ))}
    </div>
  );
}
