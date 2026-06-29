// ============================================================
// MarkdownFormatter — converts ContextSection[] to markdown.
// No provider knowledge. No budget logic.
// ============================================================

import type { ContextSection, MarkdownFormatter as IFormatter } from "./types.js";

export class MarkdownFormatter implements IFormatter {
  format(sections: ContextSection[]): string {
    const parts: string[] = ["# Project Context\n"];

    for (const s of sections) {
      try {
        const data = s.collect();
        const md = s.format(data);
        if (md) {
          parts.push(md);
        }
      } catch {
        // Skip sections that fail to collect/format
      }
    }

    return parts.join("\n");
  }
}
