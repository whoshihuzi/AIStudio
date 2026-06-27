import { useState } from "react";
import type { ToolPart } from "@/runtime/types";

interface Props {
  part: ToolPart;
}

export function ToolRenderer({ part }: Props) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    part.status === "running" ? "🔄" :
    part.status === "done"    ? "✓" :
    "✗";

  const statusColor =
    part.status === "running" ? "text-yellow-400" :
    part.status === "done"    ? "text-green-400" :
    "text-red-400";

  return (
    <div className="border border-gray-700 rounded-lg my-2 overflow-hidden text-xs">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800
                   hover:bg-gray-750 text-left transition-colors"
      >
        <span className={statusColor}>{statusIcon}</span>
        <span className="text-gray-300 font-medium">{part.toolName}</span>
        {part.status === "running" && (
          <span className="text-gray-500 ml-auto animate-pulse">running...</span>
        )}
        <span className="text-gray-600 ml-auto">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Body — expandable */}
      {expanded && (
        <div className="px-3 py-2 bg-gray-850 space-y-1.5 font-mono">
          {/* Input */}
          <div>
            <div className="text-gray-500 mb-0.5">Input:</div>
            <pre className="text-gray-300 whitespace-pre-wrap break-all">
              {JSON.stringify(part.input, null, 2)}
            </pre>
          </div>

          {/* Output (if done) */}
          {part.status === "done" && part.output !== undefined && (
            <div>
              <div className="text-gray-500 mb-0.5 border-t border-gray-700 pt-1.5">Output:</div>
              <pre className="text-gray-300 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                {part.output || "(empty)"}
              </pre>
            </div>
          )}

          {/* Error */}
          {part.status === "error" && part.output && (
            <div>
              <div className="text-red-400 mb-0.5 border-t border-gray-700 pt-1.5">Error:</div>
              <pre className="text-red-300 whitespace-pre-wrap break-all">
                {part.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
