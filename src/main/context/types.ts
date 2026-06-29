// ============================================================
// Context Injection — frozen architecture types (M8a.5).
// No implementation. Interfaces only.
// ============================================================

// ----------------------------------------------------------
// ContextSection — one piece of injectable context
// ----------------------------------------------------------

export interface ContextSection<T = unknown> {
  /** Unique identifier, e.g. "project.identity". */
  readonly id: string;
  /** Priority 0-100. Higher = included first when budget is tight. */
  readonly priority: number;
  /** Approximate token count of formatted output. */
  readonly estimatedTokens: number;
  /** If true, BudgetAllocator never removes this section. */
  readonly required: boolean;
  /** Fetch raw data from a Provider. */
  collect(): T;
  /** Format raw data into markdown. Pure function. */
  format(data: T): string;
}

// ----------------------------------------------------------
// ContextRequest — input to ContextBuilder
// ----------------------------------------------------------

export interface ContextRequest {
  tokenBudget: number;
  userPrompt: string;
}

// ----------------------------------------------------------
// ContextSectionRegistry — holds all registered sections
// ----------------------------------------------------------

export interface ContextSectionRegistry {
  register(section: ContextSection): void;
  getAll(): ContextSection[];
}

// ----------------------------------------------------------
// BudgetAllocator — token budget enforcement
// ----------------------------------------------------------

export interface BudgetAllocator {
  allocate(sections: ContextSection[], budget: number): ContextSection[];
}

// ----------------------------------------------------------
// MarkdownFormatter — produces final context markdown
// ----------------------------------------------------------

export interface MarkdownFormatter {
  format(sections: ContextSection[]): string;
}

// ----------------------------------------------------------
// ContextBuilder — orchestration only
// ----------------------------------------------------------

export interface ContextBuilder {
  build(request: ContextRequest): string;
}
