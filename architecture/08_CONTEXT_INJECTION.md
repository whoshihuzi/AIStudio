# 08 — Context Injection Architecture

**Frozen architecture for the Context Injection pipeline. No implementation yet.**

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ContextBuilder                            │
│  (orchestration only — no providers, no formatting,          │
│   no budget logic, no file parsing)                          │
│                                                             │
│  build(request: ContextRequest): string                     │
│       │                                                     │
│       ├── registry.getAll() → ContextSection[]              │
│       │                                                     │
│       ├── budgetAllocator.allocate(sections, budget)        │
│       │                                                     │
│       └── formatter.format(allocated) → markdown string     │
└─────────────────────────────────────────────────────────────┘

       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐
│SectionRegistry│  │ BudgetAllocator │  │ MarkdownFormatter│
│              │  │                 │  │                  │
│ register()   │  │ allocate()      │  │ format()         │
│ getAll()     │  │   sections[]    │  │   sections[]     │
│              │  │   budget: int   │  │   → string       │
│              │  │   → sections[]  │  │                  │
└──────┬───────┘  └─────────────────┘  └──────────────────┘
       │
       │ contains
       ▼
┌─────────────────────────────────────────────────────────────┐
│  ContextSection[]                                            │
│                                                             │
│  Each section owns:                                         │
│    id              "project.identity"                       │
│    priority         0-100                                   │
│    estimatedTokens  approximate count                       │
│    required         cannot be trimmed by BudgetAllocator    │
│    collect()        → raw data (delegates to a Provider)    │
│    format(data)     → markdown string                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Responsibilities

### ContextBuilder

- **Owns**: Orchestration of the pipeline
- **Does NOT**: Know about providers, parse files, format markdown, allocate budget
- **Single method**: `build(request: ContextRequest): string`
- **Dependencies**: Registry, BudgetAllocator, MarkdownFormatter (all injected)

### ContextSection

- **Owns**: One piece of context data
- **Knows**: How to fetch its data (via a Provider) and how to format it as markdown
- **Does NOT**: Know about other sections, budgets, or the overall context structure

### ContextSectionRegistry

- **Owns**: Collection of all registered ContextSections
- **Does NOT**: Allocate budget, format output, fetch data
- **Extension point**: `register(section)` is the only API needed to add new context

### BudgetAllocator

- **Owns**: Token budget logic
- **Input**: `ContextSection[]` + `tokenBudget: number`
- **Output**: `ContextSection[]` (subset, ordered by priority)
- **Does NOT**: Format markdown, fetch data, know about providers
- **Policy**: Required sections always included; optional sections included by priority until budget exhausted

### MarkdownFormatter

- **Owns**: Producing the final markdown string
- **Input**: `ContextSection[]` (already filtered and ordered)
- **Output**: `string` (markdown)
- **Does NOT**: Allocate budget, fetch data, know about providers
- **Policy**: Iterates sections, calls `section.format(section.collect())`, joins with markdown headers

---

## Interfaces

### ContextRequest

```typescript
interface ContextRequest {
  /** Maximum approximate token budget. Default: 4000. */
  tokenBudget: number;
  /** The user's original prompt (appended after context). */
  userPrompt: string;
}
```

### ContextSection

```typescript
interface ContextSection<T = unknown> {
  /** Unique identifier, e.g. "project.identity". */
  readonly id: string;
  /** Priority 0-100. Higher = included first when budget is tight. */
  readonly priority: number;
  /** Approximate token count of the formatted output. Used by BudgetAllocator. */
  readonly estimatedTokens: number;
  /** If true, BudgetAllocator never removes this section. */
  readonly required: boolean;
  /** Fetch raw data. Delegates to a Provider internally. */
  collect(): T;
  /** Format raw data into a markdown string. Pure function. */
  format(data: T): string;
}
```

### ContextSectionRegistry

```typescript
interface ContextSectionRegistry {
  /** Register a section. Call once at app startup for each section. */
  register(section: ContextSection): void;
  /** Returns all registered sections, sorted by priority descending. */
  getAll(): ContextSection[];
}
```

### BudgetAllocator

```typescript
interface BudgetAllocator {
  /**
   * Select which sections to include given a token budget.
   * Required sections always pass through.
   * Optional sections are included in priority order until budget is exhausted.
   */
  allocate(sections: ContextSection[], budget: number): ContextSection[];
}
```

### MarkdownFormatter

```typescript
interface MarkdownFormatter {
  /**
   * Produce the final markdown context string.
   * Calls collect() + format() on each section, joins with markdown structure.
   */
  format(sections: ContextSection[]): string;
}
```

### ContextBuilder

```typescript
interface ContextBuilder {
  /**
   * Build a complete context-augmented prompt.
   * Orchestrates: registry → budget → format → append user prompt.
   */
  build(request: ContextRequest): string;
}
```

---

## Section Catalog (v1)

| ID | Priority | Required | Est. Tokens | Provider |
|---|---|---|---|---|
| `project.identity` | 100 | yes | 80 | BrainProvider |
| `brain.focus` | 95 | yes | 60 | BrainProvider |
| `git.environment` | 90 | no | 80 | GitProvider |
| `brain.architecture` | 80 | no | 150 | BrainProvider |
| `design.principles` | 70 | no | 100 | DesignPrinciplesProvider |
| `todo.next-actions` | 50 | no | 60 | TodoProvider |
| `brain.decisions` | 40 | no | 80 | BrainProvider |
| `git.recent-commits` | 30 | no | 150 | GitProvider |

Max total: ~760 tokens (well within 4000 budget at all priority levels).

---

## Dependency Graph

```
ContextBuilder
  ├──► ContextSectionRegistry (injected)
  │      └──► ContextSection[] (registered at startup)
  │             └──► Provider (per section, e.g. BrainProvider)
  │
  ├──► BudgetAllocator (injected, standalone)
  │      Input: ContextSection[], budget
  │      Output: ContextSection[]
  │
  └──► MarkdownFormatter (injected, standalone)
         Input: ContextSection[]
         Output: string
```

**No circular dependencies. Every class has a single responsibility.**

---

## Extension Rules

### Adding a new context section (e.g., "monaco.editor-config")

1. Create one new class implementing `ContextSection`
2. Register it: `registry.register(new MonacoEditorConfigSection())`
3. Done.

**No other files change.** Not ContextBuilder, not BudgetAllocator, not MarkdownFormatter, not RuntimeManager.

### Adding a new provider (e.g., WorkspaceProvider)

1. Create the Provider class in `src/main/dashboard/`
2. Create one ContextSection that delegates to it
3. Register the section

**Existing sections and providers are untouched.**

---

## Design Principles Verification

| # | Principle | Status |
|---|---|---|
| 1 | Agent Agnostic | ✓ ContextBuilder runs above adapters; any Agent receives context |
| 2 | Layer Isolation | ✓ Main Process only; Renderer never touches context |
| 3 | Documentation is Truth | ✓ This document freezes architecture before code |
| 4 | Small Changes | ✓ 5 small classes, each single-responsibility |
| 5 | Pure Functions | ✓ `format()` is pure; `collect()` delegates to Providers |
| 6 | Explicit | ✓ Section registry explicitly declares all sources |
| 7 | Composition | ✓ ContextBuilder composes Registry + Budget + Formatter |
| 8 | Fail Fast | ✓ (implementation concern for M8b) |
| 11 | Renderer No FS | ✓ Renderer never involved in context assembly |
| 13 | Tests for Domain | ✓ BudgetAllocator + MarkdownFormatter are trivially testable |
| 15 | Workspace Identity | ✓ `project.identity` section uses ProjectInfoProvider |
| 16 | Project Brain | ✓ Primary data source for context |
| Runtime Agnostic | ✓ No adapter knows about context injection |

---

## What This Architecture Prevents

1. **God Object**: ContextBuilder cannot grow into a 500-line monolith — it delegates to three collaborators
2. **Adapter coupling**: No adapter (`HermesAdapter`) imports or knows about ContextBuilder
3. **Provider sprawl**: Sections own their Provider dependency; ContextBuilder never imports providers
4. **Budget bleeding into formatting**: BudgetAllocator and MarkdownFormatter are separate classes; changing budget policy never touches formatting
5. **Hardcoded context**: Every section is registered; removing a section means removing one `register()` call

---

## v1 vs v2

| Feature | v1 | v2 |
|---|---|---|
| Section registry | Static (registered at startup) | Dynamic (configurable via config) |
| Budget policy | Priority-based truncation | Priority + freshness scoring |
| Summarization | None (truncation only) | AI-powered compression |
| Per-agent customization | Same context for all agents | Agent-specific section selection |
| Context feedback | None | Agent reports which sections were useful |
