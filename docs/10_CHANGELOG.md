# CHANGELOG

## 2026-07-01 — v0.3.0 (M13.6 — Release Documentation Synchronization)

### Changed

- **Version bump:** `package.json` version 0.1.0 → 0.3.0
- **Architecture docs synchronized with v0.3.0 implementation:**
  - `architecture/06_COLLABORATION.md` — IPC channel table updated to match preload API surface
  - `architecture/07_PROJECT_CONTEXT.md` — session history, completion stats, known issues updated
  - `architecture/10_WORKSPACE_PROVIDER_API.md` — interface methods, IPC channels, preload bridge synced
  - `architecture/14_COMMAND_SYSTEM.md` — marked as implemented; Registry/Executor API synced; implementation status added
  - `architecture/16_DEVELOPMENT_INTELLIGENCE.md` — marked as implemented; module table + Dashboard integration documented
- **Top-level docs synchronized:**
  - `docs/01_PROJECT.md` — Phase success criteria reconciled with v0.3.0 reality
  - `docs/02_PRODUCT.md` — Added Dashboard, Editor, Command Palette sections
  - `docs/03_ROADMAP.md` — Phase labels reconciled (7 phases), completion status added
  - `docs/04_ARCHITECTURE.md` — Updated layer responsibilities with v0.3.0 modules, interface names
  - `docs/08_UI_GUIDELINES.md` — Layout diagram, Dashboard widgets, Editor, Command Palette sections added
  - `docs/09_TODO.md` — Sprint 5/6 restructured; M13.6 added as current task

### Documentation

- `docs/v0.3.0-release-checklist.md` — Release readiness checklist created

### Code Hygiene

- **Dead code:** Deleted `src/renderer/runtime/echo-runtime.ts` — EchoRuntime was a Phase 1 stub, zero references since M4 introduced ProcessAgentRuntime
- **Agent Agnosticism (renderer):** `session.ts` no longer hardcodes `"hermes"` — calls `session.create()` without adapter name. Main process resolves default adapter via `runtimeManager.listAdapters()[0]`
- **Agent Agnosticism (main):** `agent:send` and `SessionHandler.newSession` resolve default adapter from `runtimeManager.listAdapters()` instead of hardcoded `"hermes"`
- **Preload API:** `session.create(adapter)` → `session.create(adapter?)` — adapter is now optional
- **Comment cleanup:** `DefaultCommandRegistry.ts` — updated stale M11d.2-era comments; `editor.apply-patch` description no longer says "(skeleton)"

### M13 — Development Intelligence Stabilization

**Working Set (milestone-aware):**
- `FileClassifier` — added `classifyByMilestone()`: deterministic path-pattern milestone detection
- `WorkingSetEngine` — added `deriveWorkingSets()`: groups files by milestone, never merges different milestones
- `DevelopmentState` — added `workingSets: WorkingSet[]` for all independent working sets
- Backward compatible: single-milestone projects produce identical `workingSet` as before

**Document Coupling (refined):**
- `DocCouplingEngine` — rules now distinguish `architecture` (src/main/), `implementation-docs` (renderer), `changelog`, and `logs`
- Architecture docs NOT required for renderer-component-only changes
- Each coupling rule now carries explicit `reason` string

**Commit Readiness (tri-state + checklist):**
- `CommitAnalyzer` — added `assessCommitReadiness()`: returns `ready` | `almost_ready` | `not_ready`
- `DevelopmentState` — added `commitReadiness` (tri-state) and `commitChecklist: CommitChecklistItem[]`
- `IsHealthy` widget — displays tri-state with ✓/~,✗ and green/yellow/red indicators
- i18n: added `commitAlmostReady` key (en + zh-CN)

**Recommendation (actionable):**
- `ProjectActivity.deriveNextAction()` — produces specific, actionable recommendations (never vague)
- Examples: "Split into 2 commits: feat(…); docs: …", "Update 3 documentation file(s)", "Assign 5 orphan file(s) to a milestone"

**Dashboard (pure renderer):**
- `TodaysRecommendation` — now receives pre-computed `recommendation: string`, no phase switch, no derivation
- Recommendation pre-computed in `DashboardService` via `toProjectActivity()`
- `ProjectState` — added `recommendation?: string`

### Documentation

- `docs/development-intelligence-review.md` — complete M13 stabilization review (all 5 tasks verified)

---

## 2026-07-01 — v0.3.0 (M12 — Code Manipulation Foundation)

### Added

**Write Audit:**
- `src/shared/editor/audit.ts` — `WriteAuditEntry`, `WriteOperation` shared types
- `src/main/workspace/WriteAuditTrail.ts` — in-memory audit trail with circular buffer (1000 entries), queries: `recent()`, `since()`, `forPath()`
- Integrated into `WorkspaceProvider` single write gate — `writeFile`, `mkdir`, `delete`, `copy` all record audit entries
- Exposed via `WorkspaceService.getAuditTrail()`

**Diff Computation:**
- `src/shared/editor/diff.ts` — `DiffHunk`, `DiffLine`, `DiffResult` shared types
- `src/main/editor/DiffComputer.ts` — pure LCS-based line diff: `computeDiff(old, new)`, `computeFileDiff(path, old, new)`

**Editor Commands:**
- `src/main/runtime/commands/handlers/EditorHandler.ts` — `editor.open` (read from disk), `editor.save` (write through single gate), `editor.diff` (compare with disk)
- Registered 4 editor commands in `DefaultCommandRegistry`: `editor.open`, `editor.save`, `editor.diff`, `editor.apply-patch` (skeleton)
- Wired EditorHandler in `main/index.ts`

**Editor UI (textarea):**
- EditorPanel now renders a working textarea editor with file content
- EditorToolbar shows dirty indicator (● yellow dot) and functional Save/Saved button
- Ctrl+S / Cmd+S keyboard shortcut wired
- EditorStore extended with `currentContent`, `originalContent`, `dirty`, `saving`, `saveError` state

**Command System:**
- `CommandContext` extended with `args?: Record<string, unknown>` for arbitrary handler arguments
- `ipcMain.handle("command:execute")` passes raw args through to handlers

### Changed

- `WorkspaceProvider` constructor accepts optional `WriteAuditTrail` parameter
- `WorkspaceService` owns and exposes a `WriteAuditTrail` instance
- `EditorPanel` and `EditorToolbar` now read/write through EditorStore save flow
- `EditorStore` handles content loading via `documentBridge("editor.open")` and saving via `documentBridge("editor.save")`

### Verification

- `npm run typecheck` — zero errors
- `npm run build` — 54 main modules, 1139 client modules, clean
- Write audit recording on `writeFile`, `mkdir`, `delete`, `copy`
- Diff computation: pure function, zero IO, LCS algorithm
- Editor save flow: Renderer → documentBridge → IPC → EditorHandler → WorkspaceService → WorkspaceProvider (single write gate + audit)

### Out of Scope (M13+)

- Undo/Redo stack
- External change detection
- Auto-save
- Patch application (`editor.apply-patch` — command registered, handler pending)
- Monaco/CodeMirror (textarea sufficient for skeleton)

## 2026-07-01 — v0.3.0 (M11e — Command Palette UI)

### Added

**Command Palette UI (Ctrl+P):**

- `src/shared/command/types.ts` — extracted `CommandMeta` interface (serializable command metadata for IPC)
- `src/renderer/stores/command-palette.ts` — `CommandPaletteStore` (Zustand): open/close, search filter, keyboard nav, execution dispatch
- `src/renderer/components/CommandPalette.tsx` — modal overlay with search input, filtered results list, category badges, shortcut hints, keyboard footer
- `command:list` IPC channel — Main Process exposes all registered command metadata to Renderer
- Global keyboard shortcuts in App.tsx: Ctrl+P / Ctrl+K opens palette, Escape closes

**UI details:**
- Semi-transparent backdrop with click-to-close
- Floating 560px panel with search input (auto-focused)
- Results sorted by title; matches across title, description, keywords
- Category badges with abbreviated labels
- Shortcut badges on each result row
- ArrowUp/Down navigation with wrap-around, Enter to execute
- Footer with keyboard hints

**Architecture:**
- Renderer never imports from Main — only uses `window.api.command.list()` / `window.api.command.execute()`
- Store owns all palette state and filtering logic (pure function)
- Component is a pure renderer of store state

### Verification

- `npm run typecheck`: zero errors
- `npm run build`: successful (51 main modules, 1137 client modules, clean)

---

## 2026-07-01 — v0.3.0 (M13 Construction Step 5 — Dashboard Integration)

### Changed

**Dashboard Widgets Refactored to Consume DevelopmentState:**

- `IsHealthy` — now consumes `DevelopmentState` directly: completion %, warnings count, commit readiness, uncommitted risks count. No longer reads `ProjectState.status` or build checks.
- `TodaysRecommendation` — now consumes `DevelopmentState.workingSet.phase` to produce phase-based recommendations. No longer reads `ProjectState.status.recommendationType`.
- `RecentActivity` — now consumes `DevelopmentState.changedFiles` and `DevelopmentState.relatedDocuments`. No longer reads `ProjectState.recent` (commits/sessions).
- `Dashboard.tsx` — extracts `developmentState` once, passes `devState` to all Development Intelligence widgets.

**Widget Ownership Matrix:**

| Widget | Source | Status |
|--------|--------|--------|
| CurrentTask | ProjectState | Unchanged |
| MilestoneProgress | ProjectState | Unchanged |
| WorkspaceWidget | ProjectState | Unchanged |
| ProjectBrain | ProjectState | Unchanged |
| IsHealthy | DevelopmentState | Refactored (M13.5) |
| TodaysRecommendation | DevelopmentState | Refactored (M13.5) |
| RecentActivity | DevelopmentState | Refactored (M13.5) |

### Added

**i18n Keys for Development Intelligence:**

- 21 new i18n keys under `dashboard.*` for Development Intelligence display (devHealth, completion, warningsCount, commitReadiness, risksCount, devRecommendation, phaseForming/Active/Stabilizing/Review/ReviewBlocked, devActivity, changedFiles, relatedDocs, noChanges)
- English and zh-CN translations complete

**Acceptance Document:**

- `docs/development-intelligence-acceptance.md` — verifies all 6 architecture phases: Architecture, Domain, Engines, Composition, Validation, Dashboard Integration

### Verification

- `npm run typecheck`: zero errors
- `npm run build`: successful (49 main modules, 1135 client modules, clean)
- Dashboard contains zero business logic
- Every interpretation originates inside DevelopmentState
- Dashboard is a pure presentation layer

### Architecture Notes

- Widgets that consume `DevelopmentState` receive it as `devState: DevelopmentState | undefined`
- When `developmentState` is undefined (computation failure), widgets show a "not yet available" fallback
- No widget calls any engine, derives warnings, derives completion, or derives commit readiness
- All values rendered are pre-computed by `DevelopmentIntelligenceService`

---

## 2026-07-01 — v0.3.0 (M13 Construction Step 4 — DevelopmentState Verification)

### Added

**DevelopmentState Validation:**

- `docs/development-state-validation.md` — complete field-level audit of all 9 DevelopmentState fields
  - Every field traced: source → computation engine → meaning → future consumer
  - Every sub-field documented with default values and null handling
  - Cross-validation matrix: no duplicated computation, no missing computation, no impossible state, no contradictory state
  - 8 edge cases verified (all-null, clean tree, untracked only, single unknown file, mixed milestones, complete, large WS, missing tests)
  - Dashboard integration readiness declaration: zero additional business logic required

**DevelopmentState Inspector:**

- `src/main/development/DevelopmentStateInspector.ts` — pure development utility (not UI)
  - `formatDevelopmentState(state: DevelopmentState): string` — pure formatter, zero side effects
  - `inspectFromProviderData(input: ProviderData): string` — accepts raw provider data, computes + formats
  - `inspectDevelopmentState(input: DevelopmentState | ProviderData): string` — overloaded convenience
  - Built-in cross-validation section (7 assertions: commit readiness, isActive, completed/total, percentage range, estimated files, review phase, contamination consistency)
  - Formatted output: boxed ASCII layout with all 9 sections + cross-validation

**Stability Declaration:**

- `DevelopmentState` is now considered STABLE for Dashboard integration
- All 9 fields always present (never null, never undefined)
- All arrays may be empty but never null
- All strings valid, all numbers within documented ranges, all enums constrained

### Verification

- `npm run typecheck`: zero errors
- `npm run build`: successful (120 kB main, clean)
- Zero Dashboard changes
- Zero Renderer changes
- Zero Widget changes

---

## 2026-07-01 — v0.3.0 (M13 Construction Step 3 — DevelopmentIntelligenceService)

### Added

**Development Intelligence — Composition Hub:**

- `src/main/development/types.ts` — `ProviderData` input contract (3 fields: workingTree, milestone, brain)
- `src/main/development/DevelopmentIntelligenceService.ts` — `computeState(input) → DevelopmentState`

**Service implementation:**
- Pure composition hub — zero business logic, zero IO, zero state, zero cache
- Delegates ALL decisions to pure engines (WorkingSetEngine, DocCouplingEngine, WarningAnalyzer, CompletionAnalyzer, CommitAnalyzer, RiskAnalyzer)
- Parses milestone/sprint identity from provider data
- Derives `ChangedFile[]` from raw Git status strings
- Assembles complete `DevelopmentState` with all 9 fields non-null

**Dashboard integration:**
- `ProjectState.developmentState?: DevelopmentState` — optional field on existing payload
- `DashboardService.computeDevelopmentState()` — graceful degradation on failure
- Zero breaking changes to existing IPC, handlers, renderer, or widgets

### Architecture

- DevelopmentIntelligenceService owns zero filesystem, zero git, zero renderer, zero dashboard, zero UI
- Service is a pure composer — receives provider data, returns DevelopmentState
- DashboardService is the sole integrator; no other module may instantiate the service
- Follows frozen architecture Section 1.2, dependency graph Section 3
- Verified: `npm run typecheck` (zero errors), `npm run build` (120 kB main, clean)

---

## 2026-07-01 — v0.3.0 (M13 Construction Step 2 — Pure Analysis Engines)

### Added

**Development Intelligence — Pure Analysis Engines (all zero-state, zero-IO):**

- `src/main/development/FileClassifier.ts` — `classifyFile(path, changeType, milestoneId, brain?)` → `FileClassification`
  - Priority rules: path convention → brain architecture → support patterns → doc patterns → `"unknown"`
  - Internal milestone-to-path heuristics for M5–M13
- `src/main/development/DocCouplingEngine.ts` — `findRelatedDocuments(changedPaths, workspaceRoot)` → `RelatedDocument[]`
  - 18 coupling rules mapping source patterns to documentation (architecture, changelog, TODO, brain, principles)
- `src/main/development/WarningAnalyzer.ts` — `analyzeWarnings(workingSet, changedFiles, relatedDocuments)` → `DevelopmentWarning[]`
  - Detects: contamination, orphan-changes, missing-tests, missing-docs, forgotten-files, large-change
- `src/main/development/CompletionAnalyzer.ts` — `estimateCompletion(milestone, workingSet)` → `CompletionEstimate`
  - Weighted formula: 60% task completion + 40% file coverage
- `src/main/development/CommitAnalyzer.ts` — `analyzeCommitScope(workingSet, changedFiles, relatedDocuments)` → `SuggestedCommitScope`
  - Groups files by milestone into conventional commit groups with suggested messages
  - Detects orphan files, likely-forgotten files, cross-milestone contamination
- `src/main/development/RiskAnalyzer.ts` — `analyzeRisks(workingSet, warnings)` → `UncommittedRisk[]`
  - Maps warning categories to risk severity + mitigation recommendations
  - Severity escalation for error-level warnings and large working sets
- `src/main/development/WorkingSetEngine.ts` — `deriveWorkingSet(changedFiles, milestone)` → `WorkingSet`
  - Classifies each file via FileClassifier, derives phase, computes commit readiness
  - Phase lifecycle: forming → active → stabilizing → review
- `src/main/development/ProjectActivity.ts` — `toProjectActivity(state)` → `ProjectActivity`
  - Pure Dashboard projection: active working set, completion label, top warning, next action

### Architecture

- All 8 engines are pure functions — zero state, zero cache, zero IO, zero logging
- No engine imports another engine (except WorkingSetEngine → FileClassifier, by design)
- All engines depend only on `src/shared/development/types.ts`
- DevelopmentIntelligenceService NOT yet implemented (intentionally deferred to next Construction Step)
- Zero Dashboard integration, zero Provider access, zero Git access
- Verified: `npm run typecheck` (zero errors), `npm run build` (successful)

---

## 2026-07-01 — v0.3.0 (M13 Domain Layer)

### Added

**Development Intelligence — Domain Layer (Construction Step 1)**:
- `src/shared/development/types.ts` — complete frozen domain types from architecture Section 3:
  - 15 interfaces: `DevelopmentState`, `DevelopmentMilestone`, `DevelopmentSprint`, `WorkingSet`, `WorkingSetMember`, `ChangedFile`, `RelatedDocument`, `SuggestedCommitScope`, `CommitGroup`, `DevelopmentWarning`, `CompletionEstimate`, `UncommittedRisk`
  - 7 union types: `WorkingSetPhase`, `FileClassification`, `FileChangeType`, `DocRelationship`, `WarningCategory`, `WarningSeverity`, `RiskLevel`
  - 1 pure utility: `createWorkingSetId(milestoneId)` — deterministic WS ID derivation
- Zero Electron/Node/React imports — pure TypeScript domain types
- Zero circular dependencies — dependency graph begins here
- Verified: `npm run typecheck` (zero errors), `npm run build` (successful)

### Architecture

- Types follow Shared Resource Model pattern (`src/shared/`) — accessible to Main and Renderer
- All interfaces frozen per `architecture/16_DEVELOPMENT_INTELLIGENCE.md` Section 8
- `WarningSeverity` and `RiskLevel` extracted from inline unions as named types for reuse
- No Dashboard integration, no Provider composition, no UI — domain layer only

---

## 2026-07-01 — v0.2.0 (M13 Plan)

### Added

**Development Intelligence — Construction Plan**:
- `architecture/17_DEVELOPMENT_INTELLIGENCE_IMPLEMENTATION.md` — full construction contract with:
  - Module decomposition (12 new modules, 3 modified, 3 widget updates)
  - Construction order (10 steps, each compilable)
  - Complete dependency graph with zero cycles
  - Runtime data flow from Git/TODO/Brain → DevelopmentIntelligenceService → DevelopmentState → Dashboard/AI/Commands
  - Dashboard integration map (which widgets consume what from DevelopmentState)
  - Future compatibility verified: AI Runtime, Session Continuation, Workflow Engine, Release Preparation, Multi-Agent, Plugin System
  - 42-item acceptance checklist
- `DevelopmentState` frozen type model: milestone, sprint, workingSet, changedFiles, relatedDocuments, suggestedCommitScope, warnings, completionEstimate, uncommittedRisks
- Pure-function sub-engines: WorkingSetEngine, FileClassifier, DocCouplingEngine, WarningAnalyzer, CompletionAnalyzer, CommitAnalyzer, RiskAnalyzer
- Integration pathway: DashboardService → DashboardHandler → Command IPC → Renderer store → Widgets

### Architecture

- No implementation code — construction plan only
- Architecture `16_DEVELOPMENT_INTELLIGENCE.md` validated: zero design principle violations, all 18 principles satisfied
- All modules respect layer isolation (Domain types in `src/shared/`, Infrastructure in `src/main/`)
- No new providers, no new IPC channels, no new dependencies

## 2026-06-30 — v0.2.0 (M12.7)

### Changed

**Dashboard Information Architecture Correction**:
- "Current Milestone" → "Milestone Progress" — same content, clarified responsibility
- New "Current Task" widget above Milestone Progress — shows ONLY the first unchecked TODO.md task (ID, title, sprint, phase); no progress bar, no checklist
- ProjectBrain no longer duplicates task ID/title — shows only sprint goal, sprint context, phase, and metadata
- Recommendation no longer restates task title — generic "Continue current work." instead of "Continue: M11 — Command Palette UI"
- DashboardService pre-computes `currentTask` from existing milestone + brain data — zero parser changes
- All widgets render from pre-computed data; no widget derives from raw fields

### Architecture

- `types.ts` — `CurrentTask` interface (taskId, title, sprint, phase), added to `ProjectState`
- `DashboardService.ts` — `computeCurrentTask()` method, simplified `recommendationContext`
- `CurrentTask.tsx` — new widget (read-only, renders from `projectState.currentTask`)
- `CurrentMilestone.tsx` — renamed to `MilestoneProgress`, uses `i18n.milestoneProgress` key
- `ProjectBrain.tsx` — removed `brain.currentFocus.milestone` line, shows sprint goal + context
- `TodaysRecommendation.tsx` — continue-milestone uses static text, no `{milestone}` substitution
- `en.ts` / `zh-CN.ts` — added `currentTask`, `milestoneProgress` keys; updated `continueMilestone`
- `docs/dashboard-information-architecture.md` — responsibility matrix for every Dashboard section
- No parser changes. No regex changes. No TodoParser changes. No BrainFocusSync changes.

## 2026-06-30 — v0.2.0 (M12.6)

### Changed

**Mission Control Information Architecture Refresh**:
- Dashboard restructured around 4 sections: Project | Workspace | Health | Recommendation
- "Where am I?" → "Current Milestone" — shows Phase, Milestone ID/Name, task progress
- Sprint progress removed (no longer user-relevant, stats were stale)
- Working Tree now shows Clean/Dirty header with separate Modified/Untracked counts (no file list)
- "What should I do next?" → "Today's Recommendation" — rule-based priority system:
  1. Dirty tree → commit or stash
  2. Active milestone → continue
  3. Clean → ready for next milestone
- New Workspace widget showing indexed files, directories, and last index time (from WorkspaceIndexStore)
- Project Brain currentFocus auto-synced from TODO.md (BrainFocusSync module)
- Last commit time added to Git info (relative: "3 minutes ago")
- All section headers renamed to Mission Control style (Project, Workspace, Health, Recommendation)

### Architecture

- `BrainFocusSync.ts` — parses TODO.md for auto-synced currentFocus (no manual maintenance)
- `CurrentMilestone.tsx` — replaces WhereAmI.tsx
- `TodaysRecommendation.tsx` — replaces WhatNext.tsx
- `WorkspaceWidget.tsx` — new widget fed by WorkspaceIndexStore
- `DashboardHandler` now accepts WorkspaceIndexStore for index stats
- `TodoProvider` refactored: milestone-focused parsing (was sprint-focused)
- `MilestoneProgress` type updated: currentMilestone, milestoneTasks (was sprintCount, sprints)
- No new providers, no new IPC channels, no disk scanning

## 2026-06-30 — v0.2.0 (M12a)

### Added

**Editor Architecture Freeze**:
- `architecture/15_EDITOR_ARCHITECTURE.md` — frozen Editor design documentation covering:
  - Preview vs Editor separation (read-only viewer vs writable editor)
  - Overall architecture: Sidebar | MainContent | Preview/EditorPanel at App Root
  - Data flow: Renderer → EditorStore → Command → EditorHandler → WorkspaceService → WorkspaceProvider → Disk
  - Frozen EditorState interface: activeFile, originalContent, currentContent, dirty, saving, encoding, lastSaved, cursor, selection, language, readonly
  - Editor lifecycle: Open → Load → Edit → Dirty → Save → Clean → Close
  - Authoritative save path: the only file write path in the entire app
  - Future compatibility: Undo/Redo, Diff, Patch, AI Edit, Multi-file Edit, Git Stage, Conflict Resolve, Auto Save
  - Risk analysis: large files, encoding, line endings, concurrent modification, external modification, save failure, crash recovery
  - Full Design Principles compliance matrix (18 principles, all pass)
- `docs/editor-architecture-review.md` — existing module compatibility review:
  - 13 modules assessed: 12 require zero changes, 1 (App.tsx) requires minor layout addition
  - Net-new modules: EditorState types, EditorStore, EditorHandler, EditorPanel, Editor commands

## 2026-06-30 — v0.2.0 (M11d.1)

### Added

**Command Registry**:
- `src/main/runtime/commands/CommandRegistry.ts` — in-memory Command metadata store
  - Methods: register, unregister, get, has, list, listByCategory, search, clear
  - Validation: rejects duplicate IDs, empty IDs, empty titles with descriptive errors
  - Search: case-insensitive across title, description, keywords; sorted by title ASC
  - Thread safety: private Map, immutable from Renderer, Main Process only
- `src/main/runtime/commands/DefaultCommandRegistry.ts` — 10 default commands (metadata only)
  - Commands: dashboard.open, dashboard.refresh, workspace.openFile, workspace.refreshIndex, workspace.search, session.open, session.new, runtime.runChecks, settings.language, preview.close
  - No execute implementations — stub functions marked for replacement in M11d.2
- `docs/command-registry-validation.md` — 9-section verification covering:
  - Registration lifecycle, duplicate protection, empty ID/title protection
  - Search correctness (case-insensitive, multi-field, sort order)
  - Category listing, memory ownership, no-execution guarantee, architecture compliance

---
## 2026-06-30 — v0.2.0 (M11c.5)

### Added

**Command System Architecture Verification**:
- `docs/command-system-review.md` — 8-section architecture review covering:
  - Full action audit: 10 existing user actions traced to Command future (all low migration risk)
  - Module responsibility matrix: 11 modules classified (Consume/Register/Execute/Ignore)
  - Dependency cycle analysis: zero cycles, clean DAG across Registry/Executor/Workspace/Runtime/Renderer
  - Plugin validation: external "Generate README" command without source changes
  - AI agent validation: `workspace.openFile` flow with zero UI knowledge
  - Future compatibility: 9 features validated (Ctrl+P, Ctrl+Shift+P, quick open, tool calling, workflows, plugins, batch)
- `docs/command-migration-plan.md` — 37-item migration table mapping every existing button/menu/action to its future Command
- Architecture verdict: **READY** — no corrections required before M11d implementation

## 2026-06-27 — v0.2.0

### Added

**Project Awareness Dashboard**:
- Three-question Dashboard layout: Where am I? / Is the project healthy? / What should I do next?
- Milestone progress tracking with Sprint pills and progress bar
- Working tree status, typecheck/build quality gates
- Prioritized next-action recommendations from TODO.md
- ProjectBrain widget — read-only AI context display

**Internationalization**:
- i18n infrastructure: English + 简体中文
- Language persistence in `workspace/config.json`
- Electron native menu: Settings > Language
- Real-time language switching without restart

**Workspace Identity**:
- Dashboard header with project name, path, branch, tag, HEAD, clean/dirty
- Global Activity state: idle/refreshing/running-checks/building/typechecking
- `workspace/config.json` for project metadata

**Project Brain (Knowledge Layer)**:
- `workspace/brain/` with 4 structured JSON files (strict TypeScript schemas)
- `project.json`, `architecture.json`, `decisions.json`, `current-focus.json`
- BrainProvider with auto-seeding on first launch

**Data Pipeline**:
- Provider-based architecture: 8 independent providers (Git, Todo, Session, Build, Brain, ProjectInfo, DesignPrinciples, Validation)
- DashboardService as single aggregation entry point
- ValidationProvider for data integrity verification

**Context Injection**:
- ContextBuilder pipeline: Registry → BudgetAllocator → MarkdownFormatter
- 8 context sections automatically injected before every Agent prompt
- Runtime-Agnostic: works for Hermes, Claude, GPT, and future agents
- Token budget control with priority-based allocation
- Debug output to `workspace/debug/context.md` in dev mode

**Architecture Knowledge Base**:
- `architecture/` directory with 9 documents
- BOOTSTRAP, PROJECT_VISION, ARCHITECTURE, DESIGN_PRINCIPLES (16), ROADMAP, DEVELOPMENT_PROTOCOL, COLLABORATION, PROJECT_CONTEXT, CONTEXT_INJECTION

### Changed

- Session persistence moved from Sidebar component to SessionPersistence module (no React dependency)
- Exit flush guarantees no message loss on window close
- All Dashboard UI text migrated to i18n translation keys
- TypeScript strict schemas for all brain files

### Fixed

- Session auto-save race condition on window close (debounce now flushes on exit)
- Stale version numbers removed from architecture docs

### Architecture

- 8 Providers: GitProvider, TodoProvider, SessionProvider, BuildProvider, BrainProvider, ProjectInfoProvider, DesignPrinciplesProvider, ValidationProvider
- 5 Context pipeline classes: ContextBuilder, ContextSectionRegistry, BudgetAllocator, MarkdownFormatter, 8 ContextSections
- 16 Design Principles in AKB
- RuntimeManager now injects context before every adapter.run() call
