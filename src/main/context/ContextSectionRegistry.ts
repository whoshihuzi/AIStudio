// ============================================================
// ContextSectionRegistry — holds all registered sections.
// ============================================================

import type { ContextSection, ContextSectionRegistry as IRegistry } from "./types.js";

export class ContextSectionRegistry implements IRegistry {
  private sections: ContextSection[] = [];

  register(section: ContextSection): void {
    this.sections.push(section);
  }

  getAll(): ContextSection[] {
    return [...this.sections].sort((a, b) => b.priority - a.priority);
  }
}
