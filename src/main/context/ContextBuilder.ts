// ============================================================
// ContextBuilder — skeleton. Implementation in M8b.
//
// Orchestrates: registry → budget → format → append user prompt.
// Never knows about providers, never parses files, never
// formats markdown, never contains budget logic.
// ============================================================

import { ContextSectionRegistry } from "./ContextSectionRegistry.js";
import { BudgetAllocator } from "./BudgetAllocator.js";
import { MarkdownFormatter } from "./MarkdownFormatter.js";
import type { ContextRequest, ContextBuilder as IBuilder } from "./types.js";

export class ContextBuilder implements IBuilder {
  constructor(
    private readonly registry: ContextSectionRegistry,
    private readonly budget: BudgetAllocator,
    private readonly formatter: MarkdownFormatter,
  ) {}

  build(request: ContextRequest): string {
    // Architecture freeze — implementation in M8b
    const sections = this.registry.getAll();
    const allocated = this.budget.allocate(sections, request.tokenBudget);
    const context = this.formatter.format(allocated);
    return context + "\n\n---\n\n" + request.userPrompt;
  }
}
