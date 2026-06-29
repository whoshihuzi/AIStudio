// ============================================================
// BudgetAllocator — skeleton. Implementation in M8b.
// ============================================================

import type { ContextSection, BudgetAllocator as IBudget } from "./types.js";

export class BudgetAllocator implements IBudget {
  allocate(sections: ContextSection[], budget: number): ContextSection[] {
    // Architecture freeze — implementation in M8b
    // Priority-based: required first, then by priority until budget exhausted
    return sections;
  }
}
