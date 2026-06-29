import type { ImagePart } from "@/runtime/types";

interface Props {
  part: ImagePart;
}

export function ImageRenderer({ part }: Props) {
  return (
    <div className="border border-dashed border-gray-600 rounded-lg p-3 text-center text-xs text-gray-500">
      📷 {part.alt || "Image"} ({part.mimeType})
    </div>
  );
}
