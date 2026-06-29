import type { FilePart } from "@/runtime/types";

interface Props {
  part: FilePart;
}

export function FileRenderer({ part }: Props) {
  return (
    <div className="border border-dashed border-gray-600 rounded-lg p-3 text-xs text-gray-500">
      📎 <span className="text-gray-400">{part.fileName}</span>{" "}
      ({part.mimeType}
      {part.size ? `, ${Math.round(part.size / 1024)} KB` : ""})
    </div>
  );
}
