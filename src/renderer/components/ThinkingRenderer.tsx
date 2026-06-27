import { useState } from "react";
import type { ThinkingPart } from "@/runtime/types";

interface Props {
  part: ThinkingPart;
}

export function ThinkingRenderer({ part }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!part.content.trim()) return null;

  return (
    <div className="border border-gray-700/50 rounded-lg my-2 overflow-hidden text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5
                   bg-gray-800/50 hover:bg-gray-750 text-left transition-colors"
      >
        <span className="text-gray-400">💭</span>
        <span className="text-gray-500 font-medium">Thinking</span>
        <span className="text-gray-600 ml-auto">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-3 py-2 bg-gray-850/50 text-gray-400 italic leading-relaxed whitespace-pre-wrap">
          {part.content}
        </div>
      )}
    </div>
  );
}
