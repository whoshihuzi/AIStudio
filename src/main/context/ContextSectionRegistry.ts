// ============================================================
// ContextSectionRegistry — skeleton. Implementation in M8b.
// ============================================================

import type { ContextSection, ContextSectionRegistry as IRegistry } from "./types.js";

export class ContextSectionRegistry implements IRegistry {
  private sections: ContextSection[] = [];

  register(section: ContextSection): void {
    // Architecture freeze — implementation in M8b
    this.sections.push(section);
  }

  getAll(): ContextSection[] {
    // Architecture freeze — implementation in M8b
    return [...this.sections].sort((a, b) => b.priority - a.priority);
  }
}
