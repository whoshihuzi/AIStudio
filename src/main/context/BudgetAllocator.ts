// ============================================================
// BudgetAllocator — selects sections by priority within budget.
// Allocates by section-level estimatedTokens, never truncates
// markdown text. Deterministic: same input → same output.
// ============================================================

import type { ContextSection, BudgetAllocator as IBudget } from "./types.js";

export class BudgetAllocator implements IBudget {
  allocate(sections: ContextSection[], budget: number): ContextSection[] {
    const required: ContextSection[] = [];
    const optional: ContextSection[] = [];

    for (const s of sections) {
      if (s.required) {
        required.push(s);
      } else {
        optional.push(s);
      }
    }

    // Sort optional by priority descending (deterministic tie-break: by id)
    optional.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.id.localeCompare(b.id);
    });

    let used = required.reduce((sum, s) => sum + s.estimatedTokens, 0);
    const result: ContextSection[] = [...required];

    for (const s of optional) {
      if (used + s.estimatedTokens <= budget) {
        result.push(s);
        used += s.estimatedTokens;
      }
    }

    return result;
  }
}
