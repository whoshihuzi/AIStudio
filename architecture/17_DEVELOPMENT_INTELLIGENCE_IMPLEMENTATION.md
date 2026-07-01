# 17 — Development Intelligence Implementation Plan

**Construction contract for the M13 Development Intelligence subsystem.**
No implementation code. No TODO placeholders. No experimental ideas.

Frozen architecture reference: `architecture/16_DEVELOPMENT_INTELLIGENCE.md`
Implementation begins after this plan is accepted.

---

## 1. Module Decomposition

Every module that will exist. No overlapping responsibility. Each module owns exactly one concern.

### 1.1 Domain Layer — Shared Resource Model

#### 1.1.1 `src/shared/development/types.ts`

- **Responsibility**: Define every Development Intelligence data type. Pure TypeScript interfaces and type aliases only. Zero runtime code. Zero imports from Electron/Node/React.
- **Public API**: All exports are types: `DevelopmentState`, `DevelopmentMilestone`, `DevelopmentSprint`, `WorkingSet`, `WorkingSetMember`, `FileClassification`, `FileChangeType`, `WorkingSetPhase`, `ChangedFile`, `RelatedDocument`, `DocRelationship`, `SuggestedCommitScope`, `CommitGroup`, `DevelopmentWarning`, `WarningCategory`, `CompletionEstimate`, `UncommittedRisk`.
- **Dependencies**: None. Zero imports except TypeScript itself.
- **Owner**: Domain layer. Frozen per architecture Section 8.

#### 1.1.2 Module boundary rule
No other `src/shared/` module may define Development Intelligence types. No `src/main/` type definition. No `src/renderer/` definition. The single source of truth is `src/shared/development/types.ts`.

### 1.2 Infrastructure Layer — Service

#### 1.2.1 `src/main/development/DevelopmentIntelligenceService.ts`

- **Responsibility**: Compose `DevelopmentState` from existing provider data. Pure composition — no file I/O, no Git execution, no new storage. Receives provider data as input, returns `DevelopmentState` as output.
- **Public API**:
  ```typescript
  export class DevelopmentIntelligenceService {
    /**
     * Pure composition: provider data → DevelopmentState.
     * Zero side effects. Caller owns all provider instantiation.
     */
    computeState(input: ProviderData): DevelopmentState;
  }
  ```
  Where `ProviderData` is a services-internal input type (see 1.2.2).
- **Dependencies**:
  - `GitProvider.getWorkingTree()` → `WorkingTree`
  - `TodoProvider.getMilestoneProgress()` → `MilestoneProgress`
  - `BrainProvider.getBrainData()` → `BrainData`
  - `src/shared/development/types.ts` — all type definitions
  - **Must NOT** depend on: `DashboardService`, any `src/renderer/` module, any `src/preload/` module, any provider NOT listed above
- **Owner**: Infrastructure layer. Pure composer per architecture Section 2.

#### 1.2.2 `src/main/development/types.ts`

- **Responsibility**: Define `ProviderData` — the input type that `DevelopmentIntelligenceService.computeState()` accepts. This is the contract between the service and its callers (DashboardService). It is NOT a shared resource model type; it lives in Infrastructure because it references Infrastructure providers.
- **Public API**:
  ```typescript
  export interface ProviderData {
    workingTree: WorkingTree | null;
    milestone: MilestoneProgress | null;
    brain: BrainData | null;
  }
  ```
- **Dependencies**: `src/main/dashboard/types.ts` (WorkingTree, MilestoneProgress, BrainData types); `src/shared/development/types.ts` (no dependency — types are output, not input).
- **Owner**: Infrastructure layer. Internal to the `development/` directory.

#### 1.2.3 Module boundary rule
`ProviderData` contains ONLY the three fields above. It never adds fields that require new providers. If new intelligence requires new data, the caller enriches the data before passing it to the service — the service remains a closed function.

### 1.3 Infrastructure Layer — Pure Logic Modules

#### 1.3.1 `src/main/development/WorkingSetEngine.ts`

- **Responsibility**: Derive `WorkingSet` from changed files + milestone identity. Classify each changed file as `core`/`support`/`incidental`/`unknown`. Determine Working Set phase.
- **Public API**:
  ```typescript
  export function deriveWorkingSet(
    changedFiles: ChangedFile[],
    milestone: DevelopmentMilestone,
  ): WorkingSet;
  ```
- **Dependencies**: `src/shared/development/types.ts` only. Pure function — all side-effect inputs (Git file list, milestone data) provided by caller.
- **Owner**: Infrastructure layer. Part of `development/` directory.

#### 1.3.2 `src/main/development/FileClassifier.ts`

- **Responsibility**: Classify a single file path relative to a milestone using project conventions. Maps source paths to `FileClassification`. Used by `WorkingSetEngine`.
- **Public API**:
  ```typescript
  export function classifyFile(
    path: string,
    changeType: FileChangeType,
    milestone: DevelopmentMilestone,
    brainArchitecture: BrainArchitecture,
  ): FileClassification;
  ```
- **Dependencies**: `src/shared/development/types.ts`, `src/main/dashboard/types.ts` (BrainArchitecture only — accessed via BrainProvider, not directly).
- **Owner**: Infrastructure layer. The classification rules (path convention, Git history, Brain metadata, fallback) are implementation details.

#### 1.3.3 `src/main/development/DocCouplingEngine.ts`

- **Responsibility**: Map changed source files to related documentation files using project conventions. Used by `DevelopmentIntelligenceService`.
- **Public API**:
  ```typescript
  export function findRelatedDocuments(
    changedPaths: string[],
    workspaceRoot: string,
  ): RelatedDocument[];
  ```
- **Dependencies**: `src/shared/development/types.ts`. No filesystem I/O — path resolution only (the service checks existence).
- **Owner**: Infrastructure layer. Documentation coupling mappings are derived from project conventions, not hardcoded maps.

#### 1.3.4 `src/main/development/WarningAnalyzer.ts`

- **Responsibility**: Detect development warnings from the Working Set state. Produces `DevelopmentWarning[]` with severity, message, affected files, and category.
- **Public API**:
  ```typescript
  export function analyzeWarnings(
    workingSet: WorkingSet,
    changedFiles: ChangedFile[],
    relatedDocuments: RelatedDocument[],
  ): DevelopmentWarning[];
  ```
- **Dependencies**: `src/shared/development/types.ts` only. Pure function.
- **Owner**: Infrastructure layer.

#### 1.3.5 `src/main/development/CompletionAnalyzer.ts`

- **Responsibility**: Estimate milestone completion from task progress + file change coverage. Produces `CompletionEstimate`.
- **Public API**:
  ```typescript
  export function estimateCompletion(
    milestone: DevelopmentMilestone,
    workingSet: WorkingSet,
  ): CompletionEstimate;
  ```
- **Dependencies**: `src/shared/development/types.ts` only. Pure function.
- **Owner**: Infrastructure layer.

#### 1.3.6 `src/main/development/CommitAnalyzer.ts`

- **Responsibility**: Analyze commit readiness. Produces `SuggestedCommitScope` (commit groups, orphan files, likely forgotten, contamination detection).
- **Public API**:
  ```typescript
  export function analyzeCommitScope(
    workingSet: WorkingSet,
    changedFiles: ChangedFile[],
    relatedDocuments: RelatedDocument[],
  ): SuggestedCommitScope;
  ```
- **Dependencies**: `src/shared/development/types.ts` only. Pure function.
- **Owner**: Infrastructure layer.

#### 1.3.7 `src/main/development/RiskAnalyzer.ts`

- **Responsibility**: Identify uncommitted risks from warnings + Working Set state. Produces `UncommittedRisk[]`.
- **Public API**:
  ```typescript
  export function analyzeRisks(
    workingSet: WorkingSet,
    warnings: DevelopmentWarning[],
  ): UncommittedRisk[];
  ```
- **Dependencies**: `src/shared/development/types.ts` only. Pure function.
- **Owner**: Infrastructure layer.

### 1.4 Infrastructure Layer — Data Transformation

#### 1.4.1 `src/main/development/ProjectActivity.ts`

- **Responsibility**: Transform `DevelopmentState` into a compact `ProjectActivity` summary for dashboard card display. Not part of DevelopmentState itself — it's a Dashboard-facing projection.
- **Public API**:
  ```typescript
  export interface ProjectActivity {
    activeWorkingSet: string | null;     // e.g. "M12 (8 files, active)"
    completion: string;                  // e.g. "75% complete"
    topWarning: string | null;           // e.g. "CHANGELOG.md needs update"
    nextAction: string;                  // e.g. "Commit M12 working set"
  }

  export function toProjectActivity(state: DevelopmentState): ProjectActivity;
  ```
- **Dependencies**: `src/shared/development/types.ts` only. Pure function.
- **Owner**: Infrastructure layer, but Dashboard-facing.

### 1.5 Integration — No New Modules

The following are NOT new modules. They are modifications to existing modules:

#### 1.5.1 `DashboardService.ts` (MODIFIED)
- Added responsibility: Optionally compose `DevelopmentIntelligenceService` alongside existing providers. New method or optional field: `getDevelopmentState()?` → `DevelopmentState`. Decision on whether to include in `getProjectState()` or expose separately is deferred to Phase 3 (Dashboard integration decision per architecture Section 8, evolving list).

#### 1.5.2 `DashboardHandler.ts` (MODIFIED)
- Added responsibility: Serve `DevelopmentState` via the existing `dashboard.refresh` payload or a new `dashboard.dev-intel` command. No new IPC channel — reuses existing Command pattern.

### 1.6 Summary Table

| Module | Layer | Purpose | Dependencies |
|---|---|---|---|
| `src/shared/development/types.ts` | Domain | All DevIntel types | None |
| `src/main/development/DevelopmentIntelligenceService.ts` | Infrastructure | Pure composition hub | GitProvider, TodoProvider, BrainProvider (via input), sub-engines |
| `src/main/development/types.ts` | Infrastructure | `ProviderData` input contract | `src/main/dashboard/types.ts` |
| `src/main/development/WorkingSetEngine.ts` | Infrastructure | Working Set derivation | `src/shared/development/types.ts` |
| `src/main/development/FileClassifier.ts` | Infrastructure | File classification | `src/shared/development/types.ts`, BrainArchitecture type |
| `src/main/development/DocCouplingEngine.ts` | Infrastructure | Document coupling detection | `src/shared/development/types.ts` |
| `src/main/development/WarningAnalyzer.ts` | Infrastructure | Warning detection | `src/shared/development/types.ts` |
| `src/main/development/CompletionAnalyzer.ts` | Infrastructure | Completion estimation | `src/shared/development/types.ts` |
| `src/main/development/CommitAnalyzer.ts` | Infrastructure | Commit scope analysis | `src/shared/development/types.ts` |
| `src/main/development/RiskAnalyzer.ts` | Infrastructure | Risk identification | `src/shared/development/types.ts` |
| `src/main/development/ProjectActivity.ts` | Infrastructure | Dashboard projection | `src/shared/development/types.ts` |
| `src/main/dashboard/DashboardService.ts` | Infrastructure (modified) | Composes DevIntel alongside providers | DevelopmentIntelligenceService |
| `src/main/runtime/commands/handlers/DashboardHandler.ts` | Infrastructure (modified) | Serves DevIntel to Renderer | DashboardService |

---

## 2. Construction Order

The order minimizes refactoring. Every step leaves the project compilable. No step introduces dead code that later steps must clean up.

### Step 1 — Domain Types
**File**: `src/shared/development/types.ts`
**Action**: Create the file with ALL type definitions from the frozen architecture (Section 3 of 16_DEVELOPMENT_INTELLIGENCE.md).
**Compilable?** Yes. Types-only file, zero runtime imports. No existing code references it.
**Verification**: `npm run typecheck` passes (new types are valid TypeScript).

### Step 2 — ProviderData Input Type
**File**: `src/main/development/types.ts`
**Action**: Create `ProviderData` interface. Minimal — three fields.
**Compilable?** Yes. References existing `src/main/dashboard/types.ts` types.
**Verification**: `npm run typecheck` passes.

### Step 3 — Pure Logic Engines (in parallel, no interdependencies)
**Files**:
- `src/main/development/FileClassifier.ts`
- `src/main/development/DocCouplingEngine.ts`
- `src/main/development/WarningAnalyzer.ts`
- `src/main/development/CompletionAnalyzer.ts`
- `src/main/development/CommitAnalyzer.ts`
- `src/main/development/RiskAnalyzer.ts`

**Action**: Create all six pure-function modules. Each takes typed input, returns typed output. No module imports any other module from this list. They all depend only on `src/shared/development/types.ts`.
**Compilable?** Yes. All modules are standalone pure functions. None is imported by existing code.
**Verification**: `npm run typecheck` passes. All function signatures type-check.

### Step 4 — WorkingSetEngine (depends on FileClassifier)
**File**: `src/main/development/WorkingSetEngine.ts`
**Action**: Create `deriveWorkingSet()`. Imports `FileClassifier.classifyFile()`. Composes `WorkingSet` from `ChangedFile[]` + `DevelopmentMilestone`.
**Compilable?** Yes. Depends on Step 3 output.
**Verification**: `npm run typecheck` passes.

### Step 5 — ProjectActivity Projection
**File**: `src/main/development/ProjectActivity.ts`
**Action**: Create `toProjectActivity()`. Pure mapping from `DevelopmentState` to `ProjectActivity`.
**Compilable?** Yes. Depends only on Step 1 types.
**Verification**: `npm run typecheck` passes.

### Step 6 — DevelopmentIntelligenceService (composition hub)
**File**: `src/main/development/DevelopmentIntelligenceService.ts`
**Action**: Create `computeState(input: ProviderData): DevelopmentState`. Imports all sub-engines. Composes everything into a single `DevelopmentState` object.
**Compilable?** Yes. All dependencies exist from Steps 1–5.
**Verification**: `npm run typecheck` passes. Service compiles without errors.

### Step 7 — Integration: DashboardService Modification
**File**: `src/main/dashboard/DashboardService.ts`
**Action**: Add optional composition of `DevelopmentIntelligenceService`. This step achieves the data flow: `GitProvider + TodoProvider + BrainProvider` → `ProviderData` → `DevelopmentIntelligenceService.computeState()` → `DevelopmentState`. The decision of whether `getProjectState()` includes `DevelopmentState` or a separate method exposes it is made here.
**Compilable?** Yes. DashboardService already composes providers — adding one more composer follows the same pattern.
**Verification**: `npm run typecheck` passes. `npm run build` passes.

### Step 8 — Integration: DashboardHandler Modification
**File**: `src/main/runtime/commands/handlers/DashboardHandler.ts`
**Action**: Serve `DevelopmentState` to the Renderer. Either as part of `dashboard.refresh` payload or via a new command. The Renderer receives `DevelopmentState` through the same Command IPC pattern as `ProjectState`.
**Compilable?** Yes. Handler already serves `ProjectState`.
**Verification**: `npm run typecheck` passes. `npm run build` passes.

### Step 9 — Dashboard Widget Updates
**Files** (Renderer only):
- `src/renderer/components/Dashboard.tsx` — receive optional `DevelopmentState` prop
- `src/renderer/components/IsHealthy.tsx` — surface `DevelopmentState.warnings` alongside build status
- `src/renderer/components/TodaysRecommendation.tsx` — use `DevelopmentState.workingSet.isCommitReady` for recommendation
- `src/renderer/components/CurrentMilestone.tsx` — show `DevelopmentState.completionEstimate.percentage`

**Action**: Each widget receives `DevelopmentState | null` as an additional prop (not replacing `ProjectState`). Widgets render, never derive. The Dashboard becomes "thinner" — it delegates intelligence questions to `DevelopmentState` instead of interpreting raw provider data.
**Compilable?** Yes. Widgets receive new optional props. Existing rendering paths are unchanged when `DevelopmentState` is null.
**Verification**: `npm run typecheck` passes. `npm run build` passes.

### Step 10 — Verification + Documentation
**Actions**:
- Run `npm run typecheck && npm run build`
- Update `docs/09_TODO.md` to mark M13 complete
- Update `docs/10_CHANGELOG.md` with summary
- This implementation plan remains the construction contract

---

## 3. Dependency Graph

Every dependency points downward. No cycles. No Dashboard logic inside Development Intelligence. No Provider depending on Development Intelligence.

```
                          src/shared/development/types.ts
                          (Domain — zero dependencies)
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
  FileClassifier.ts        DocCouplingEngine.ts       WarningAnalyzer.ts
  classifyFile()           findRelatedDocuments()     analyzeWarnings()
          │                         │                         │
          └───────────┬─────────────┘                         │
                      │                                       │
                      ▼                                       │
             WorkingSetEngine.ts                              │
             deriveWorkingSet()                               │
                      │                                       │
          ┌───────────┼───────────┬───────────────┐           │
          │           │           │               │           │
          ▼           ▼           ▼               ▼           │
  CompletionAnalyzer  CommitAnalyzer  RiskAnalyzer  ─────────┘
          │           │           │
          └───────────┼───────────┘
                      │
                      ▼
          DevelopmentIntelligenceService.ts
          computeState(ProviderData) → DevelopmentState
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
  GitProvider    TodoProvider   BrainProvider
  (input data —  (input data —  (input data —
   never called    never called   never called
   by service)     by service)     by service)
                      │
                      ▼
             DashboardService.ts
             (composes DevIntelService alongside providers)
                      │
                      ▼
             DashboardHandler.ts
             (serves DevelopmentState to Renderer via Command IPC)
                      │
                      ▼
             Renderer Dashboard Widgets
             (receive DevelopmentState | null as prop)
                      │
          ┌───────────┼───────────┬───────────────┐
          │           │           │               │
          ▼           ▼           ▼               ▼
     IsHealthy    TodaysRec    CurrentMilestone   Dashboard
     (warnings)   (commit-ready)(completion%)    (root)
```

### Dependency Rule Enforcement

1. **No cycle**: Files flow downward only. `DevelopmentIntelligenceService` calls sub-engines → sub-engines return data to service → service returns to `DashboardService` → DashboardService returns to handler → handler sends to renderer. No reverse call chain.

2. **Providers never import DevelopmentIntelligenceService**: GitProvider, TodoProvider, and BrainProvider are upstream data sources. They know nothing about Development Intelligence. The service consumes their output through the `ProviderData` input type — it never calls them directly.

3. **DashboardService is the integration point**: It owns the decision of whether and when to invoke `DevelopmentIntelligenceService`. No other module may instantiate or call `DevelopmentIntelligenceService`.

4. **Dashboard contains no Development Intelligence logic**: The Dashboard `IsHealthy` widget receives `DevelopmentState.warnings` and renders them — it never classifies files, detects warnings, or analyzes commits. All intelligence is pre-computed in the Infrastructure layer.

---

## 4. Data Flow

### 4.1 Complete Runtime Flow

```
┌─────────────────────────────────────────────────────────┐
│                     DATA SOURCES                         │
│                                                         │
│  Git (git status --short)                                │
│      │                                                  │
│      ▼                                                  │
│  GitProvider.getWorkingTree() → WorkingTree              │
│      │  { isClean, modified, untracked, files }         │
│      │                                                  │
│  docs/09_TODO.md                                        │
│      │                                                  │
│      ▼                                                  │
│  TodoProvider.getMilestoneProgress() → MilestoneProgress │
│      │  { currentMilestone, milestoneTasks, phase }     │
│      │                                                  │
│  workspace/brain/*.json                                  │
│      │                                                  │
│      ▼                                                  │
│  BrainProvider.getBrainData() → BrainData                │
│      │  { project, architecture, decisions, currentFocus}│
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  DashboardService │
              │  composes into   │
              │  ProviderData {   │
              │    workingTree,   │
              │    milestone,     │
              │    brain          │
              │  }                │
              └────────┬─────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ DevelopmentIntelligenceService │
        │ .computeState(providerData)    │
        │                                │
        │  ┌─────────────────────────┐   │
        │  │ 1. Parse milestone      │   │
        │  │    identity from        │   │
        │  │    milestone + brain    │   │
        │  └───────────┬─────────────┘   │
        │              │                 │
        │  ┌───────────▼─────────────┐   │
        │  │ 2. Derive ChangedFile[] │   │
        │  │    from WorkingTree     │   │
        │  │    + milestone mapping  │   │
        │  └───────────┬─────────────┘   │
        │              │                 │
        │  ┌───────────▼─────────────┐   │
        │  │ 3. WorkingSetEngine:    │   │
        │  │    classify each file   │   │
        │  │    (core/support/       │   │
        │  │     incidental/unknown) │   │
        │  │    → WorkingSet         │   │
        │  └───────────┬─────────────┘   │
        │              │                 │
        │  ┌───────────▼─────────────┐   │
        │  │ 4. DocCouplingEngine:   │   │
        │  │    map source paths     │   │
        │  │    → RelatedDocument[]  │   │
        │  └───────────┬─────────────┘   │
        │              │                 │
        │  ┌───────────▼─────────────┐   │
        │  │ 5. WarningAnalyzer:     │   │
        │  │    check contamination,  │   │
        │  │    forgotten files,      │   │
        │  │    missing docs          │   │
        │  │    → DevelopmentWarning[]│   │
        │  └───────────┬─────────────┘   │
        │              │                 │
        │  ┌───────────▼─────────────┐   │
        │  │ 6. CompletionAnalyzer:  │   │
        │  │    tasks done/total,    │   │
        │  │    files changed/est.   │   │
        │  │    → CompletionEstimate │   │
        │  └───────────┬─────────────┘   │
        │              │                 │
        │  ┌───────────▼─────────────┐   │
        │  │ 7. CommitAnalyzer:      │   │
        │  │    group files, detect  │   │
        │  │    orphans, suggest     │   │
        │  │    messages             │   │
        │  │    → SuggestedCommitScope│  │
        │  └───────────┬─────────────┘   │
        │              │                 │
        │  ┌───────────▼─────────────┐   │
        │  │ 8. RiskAnalyzer:        │   │
        │  │    assess uncommitted   │   │
        │  │    risks from warnings  │   │
        │  │    + working set state  │   │
        │  │    → UncommittedRisk[]  │   │
        │  └───────────┬─────────────┘   │
        │              │                 │
        │  ┌───────────▼─────────────┐   │
        │  │ 9. Assemble             │   │
        │  │    DevelopmentState      │   │
        │  └─────────────────────────┘   │
        └──────────────┬─────────────────┘
                       │
                       ▼
              DevelopmentState {
                milestone, sprint,
                workingSet, changedFiles,
                relatedDocuments,
                suggestedCommitScope,
                warnings,
                completionEstimate,
                uncommittedRisks
              }
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
    ProjectActivity  Dashboard    Command Palette
    (compact card)   Widgets      (dynamic commands)
          │            │            │
          ▼            ▼            ▼
    Dashboard     IsHealthy     "Commit M12 Working Set"
    Activity      (warnings)    "Show Forgotten Files"
    Card          TodaysRec     "Update Related Docs"
                  (commit-ready)

          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
    AI Runtime    Session       Release
    (context)     Handoff       Checklist
```

### 4.2 Key Data Flow Rules

1. **Providers are upstream, never downstream** — `DevelopmentIntelligenceService` never calls `GitProvider`, `TodoProvider`, or `BrainProvider`. It receives their output via `ProviderData`. This keeps it a pure transformation.

2. **DashboardService is the sole integrator** — Only `DashboardService` may instantiate or invoke `DevelopmentIntelligenceService`. No renderer code. No preload code. No IPC handler.

3. **Renderer receives pre-computed state** — Widgets receive `DevelopmentState` (or its projection `ProjectActivity`) and render it. They never call `DashboardService`, `DevelopmentIntelligenceService`, or any provider.

4. **Command Palette consumes DevelopmentState** — Dynamic commands like `"Commit M12 Working Set"` are derived from `DevelopmentState.suggestedCommitScope` and `DevelopmentState.warnings`. The Command Palette reads `DevelopmentState` and generates contextual commands. This is a v0.4 capability — architecturally supported by this data model.

---

## 5. Dashboard Integration

### 5.1 Widget Consumption Map

Every widget receives `ProjectState` and optionally `DevelopmentState`. No widget is redesigned. Existing widgets become thinner — they offload interpretation to `DevelopmentState`.

| Widget | What It Reads From `DevelopmentState` | What It No Longer Needs |
|---|---|---|
| `IsHealthy.tsx` | `state.warnings` — error/warn/info entries with category, message, affected files | Replaces ad-hoc health interpretation from `workingTree.isClean` + `build` |
| `TodaysRecommendation.tsx` | `state.workingSet.isCommitReady` — binary; `state.workingSet.commitBlockerReason` — if not ready | Replaces the current rule-based priority system in `computeStatus()` |
| `CurrentMilestone.tsx` | `state.completionEstimate` — percentage, tasks ratio, files ratio, label | Gains completion information; milestone identity still from `ProjectState.milestone` |
| `Dashboard.tsx` (root) | `state.workingSet.id`, `state.workingSet.phase` — for display in the Dashboard header | No change; passes `DevelopmentState` as optional prop to children |
| `RecentActivity.tsx` | No `DevelopmentState` consumption | Unchanged |
| `WorkspaceWidget.tsx` | No `DevelopmentState` consumption | Unchanged |
| `CurrentTask.tsx` | No `DevelopmentState` consumption | Unchanged |
| `ProjectBrain.tsx` | No `DevelopmentState` consumption | Unchanged |

### 5.2 Widgets That Become Thinner

**`IsHealthy.tsx`** currently:
- Receives `data: ProjectState` AND `build: DashboardBuildStatus` (separate prop)
- Renders build status + working tree status
- No warnings

After:
- Receives `data: ProjectState` AND `devState: DevelopmentState | null` (optional prop)
- Renders `devState.warnings` entries alongside build/working tree
- Warnings have severity icons, categories, messages, affected files
- No logic — pure render

**`TodaysRecommendation.tsx`** currently:
- Reads `projectState.status.recommendationType` and `.recommendationContext`
- Pre-computed by `DashboardService.computeStatus()` from working tree + milestone

After:
- Additionally reads `devState.workingSet.isCommitReady`
- If `isCommitReady === true` → recommend commit
- If `isCommitReady === false` → show `commitBlockerReason`
- Falls back to existing recommendation logic when `devState` is null

**`DashboardService.computeStatus()`** becomes thinner:
- No longer the sole recommendation authority
- `DevelopmentState` warnings and commit readiness supplement the existing recommendation
- `computeStatus()` still handles the basic dirty-tree/continue-milestone/ready-for-next cases

### 5.3 What Does NOT Change

- `DashboardService.getProjectState()` — still the primary entry point
- `DashboardHandler.refresh()` — still serves `ProjectState` to renderer
- `useDashboardStore` — still receives `projectState` from IPC
- All existing widgets — still receive `ProjectState` as `data` prop
- `DevelopmentState` is an ADDITIONAL payload, not a replacement

### 5.4 Integration Decision (Evolving)

Per architecture Section 8 (evolving list):
> "Whether DashboardService composes DevelopmentIntelligenceService directly or via proxy"

The implementation plan uses this approach: `DashboardService` optionally composes `DevelopmentIntelligenceService` in `getProjectState()`. The `DevelopmentState` object is returned alongside `ProjectState`, and the `DashboardHandler` packages both into the IPC payload. The renderer store receives both. Widgets opt into `DevelopmentState` consumption.

This is the simplest integration with zero breaking changes. If future requirements demand separate composition, the service can be extracted without changing any widget.

---

## 6. Future Compatibility

### 6.1 AI Runtime

```
AI Agent (Hermes, Claude, etc.)
    │
    │  DevelopmentState provided as structured context
    │  via a tool call or context injection
    │
    ▼
"Your working set for M12 has 8 files. 2 test files missing.
 CHANGELOG.md should be updated. Working set is 75% complete."
```

**Compatibility**: `DevelopmentState` is a pure data object in `src/shared/`. AI agents receive it through the same path as any other shared resource model. No new IPC. No new parsing. `DevelopmentState` is agent-agnostic — it has zero agent/runtime identifiers per Principle 1.

### 6.2 Session Continuation

```
Session ends → handoff snapshot written
    │
    │  DevelopmentIntelligenceService.getHandoffSnapshot()
    │  or: toHandoff(state: DevelopmentState): HandoffSnapshot
    │
    ▼
Next session starts → AI reads handoff → continues without re-discovery
```

**Compatibility**: `DevelopmentState` already contains all fields needed for handoff: `workingSet`, `completionEstimate`, `warnings`, `milestone`. A `toHandoff()` projection function in `ProjectActivity.ts` or a new `HandoffSnapshot` module can produce the snapshot without modifying `DevelopmentState`. The handoff format is an evolving concern per architecture Section 8.

### 6.3 Workflow Engine

```
Workflow engine receives DevelopmentState
    │
    ├──► workingSet.phase === "review" → trigger review workflow
    ├──► workingSet.isCommitReady → trigger commit workflow
    ├──► warnings.length > 0 → trigger fix workflow
    └──► completionEstimate.percentage ≥ 100 → trigger release workflow
```

**Compatibility**: Workflow decisions are based on `DevelopmentState` fields. No redesign of `DevelopmentState` is required. Workflow triggers map to existing `WorkingSetPhase`, `isCommitReady`, and `CompletionEstimate` fields. The Workflow Engine is an Infrastructure-layer consumer, not a provider.

### 6.4 Release Preparation

```
Release checklist
    │
    ▼
DevelopmentIntelligenceService
    │
    ├──► All Working Sets committed: ✓
    ├──► Changelog updated: ✓
    ├──► No contamination warnings: ✓
    └──► Architecture docs updated: ✓
```

**Compatibility**: Release readiness is computed from `DevelopmentState` fields. The `RelatedDocument` list + `WarningCategory.missing-docs` tells whether documentation is complete. The `SuggestedCommitScope` tells whether all files are grouped. No new data model — only new query logic.

### 6.5 Multi-Agent

```
Agent A → Working on M12 (editor)  ──► WorkingSet { milestoneId: "M12", members: 8 }
Agent B → Working on M13 (dev-intel) ──► WorkingSet { milestoneId: "M13", members: 4 }
    │
    ▼
DevelopmentState tracks both working sets. Contamination
detection flags cross-agent file conflicts.
```

**Compatibility**: `WorkingSet` is already milestone-scoped. Multiple agents produce multiple Working Sets with different `milestoneId` values. `SuggestedCommitScope` can group commits per working set. The `orphanFiles` field in `SuggestedCommitScope` detects files that belong to no agent's working set. The `mixesMultipleMilestones` flag detects when one agent's commit includes files from another agent's milestone.

### 6.6 Plugin System

```
Plugin: Custom File Classifier
    │
    │  Implements: IFileClassifier
    │  Registers: development.fileClassifier
    │
    ▼
DevelopmentIntelligenceService uses registered classifier
instead of default FileClassifier
```

**Compatibility**: `FileClassifier` is a standalone module with a single function `classifyFile()`. A plugin system can replace it with a registered implementation. The `DevelopmentIntelligenceService` depends on the interface, not the concrete class. This follows the existing `ICommandHandler` / `IAgentRuntime` pattern. The architecture supports it; actual plugin registration is a v0.5+ concern.

### 6.7 Summary

No future subsystem requires a redesign of `DevelopmentState` or `DevelopmentIntelligenceService`. The data model is complete for all known future consumers. The service is a pure composition function — thin, testable, and swappable at its integration point.

---

## 7. Acceptance Checklist

Development Intelligence is considered complete ONLY when every item below is checked.

### 7.1 Types Exist

- [ ] `src/shared/development/types.ts` exists with all interfaces from architecture Section 3
- [ ] All types are pure data (no Electron, no Node, no React imports)
- [ ] All types are in `src/shared/` (Domain layer, accessible to Main and Renderer)
- [ ] No `any` type anywhere in Development Intelligence types
- [ ] Every field has an explicit type annotation
- [ ] All union types are exhaustive (`FileClassification`, `WorkingSetPhase`, `WarningCategory`, `DocRelationship`, `FileChangeType`)

### 7.2 Service Exists

- [ ] `src/main/development/DevelopmentIntelligenceService.ts` exists
- [ ] `computeState(input: ProviderData): DevelopmentState` is the only public method
- [ ] Service performs zero filesystem I/O
- [ ] Service performs zero `child_process` exec
- [ ] Service never instantiates `GitProvider`, `TodoProvider`, or `BrainProvider`
- [ ] Service receives all data via `ProviderData` input parameter
- [ ] Service returns a complete `DevelopmentState` with all fields non-null (arrays may be empty, but fields are present)

### 7.3 Pure Logic Engines Exist

- [ ] `WorkingSetEngine.ts` — `deriveWorkingSet()` returns WorkingSet with phase and members
- [ ] `FileClassifier.ts` — `classifyFile()` returns `core`/`support`/`incidental`/`unknown`
- [ ] `DocCouplingEngine.ts` — `findRelatedDocuments()` returns `RelatedDocument[]`
- [ ] `WarningAnalyzer.ts` — `analyzeWarnings()` returns `DevelopmentWarning[]`
- [ ] `CompletionAnalyzer.ts` — `estimateCompletion()` returns `CompletionEstimate`
- [ ] `CommitAnalyzer.ts` — `analyzeCommitScope()` returns `SuggestedCommitScope`
- [ ] `RiskAnalyzer.ts` — `analyzeRisks()` returns `UncommittedRisk[]`
- [ ] All engines are pure functions (no side effects, no state, no class instances)
- [ ] All engines depend only on `src/shared/development/types.ts`
- [ ] No engine imports another engine (except `WorkingSetEngine` imports `FileClassifier`)

### 7.4 Data Flow Works

- [ ] `GitProvider.getWorkingTree()` → `WorkingTree` → `ProviderData.workingTree`
- [ ] `TodoProvider.getMilestoneProgress()` → `MilestoneProgress` → `ProviderData.milestone`
- [ ] `BrainProvider.getBrainData()` → `BrainData` → `ProviderData.brain`
- [ ] `ProviderData` → `DevelopmentIntelligenceService.computeState()` → `DevelopmentState`
- [ ] `DevelopmentState` contains: milestone, sprint, workingSet, changedFiles, relatedDocuments, suggestedCommitScope, warnings, completionEstimate, uncommittedRisks
- [ ] `DevelopmentState` is serializable (JSON-safe — no Maps, no Sets in the frozen interface)

### 7.5 Dashboard Integration Exists

- [ ] `DashboardService` optionally composes `DevelopmentIntelligenceService`
- [ ] `DashboardHandler` serves `DevelopmentState` to Renderer via Command IPC
- [ ] Renderer store receives `DevelopmentState` alongside `ProjectState`
- [ ] `IsHealthy` widget renders `DevelopmentState.warnings`
- [ ] `TodaysRecommendation` widget reads `DevelopmentState.workingSet.isCommitReady`
- [ ] `CurrentMilestone` widget reads `DevelopmentState.completionEstimate`
- [ ] No widget calls `DevelopmentIntelligenceService` directly
- [ ] No widget performs file classification or warning analysis

### 7.6 Architecture Rules Enforced

- [ ] No Provider (GitProvider, TodoProvider, BrainProvider) imports from `development/`
- [ ] No `DashboardService` logic inside `development/` directory
- [ ] No `development/` module imports from `src/renderer/`
- [ ] No `development/` module imports from `src/preload/`
- [ ] `DevelopmentState` types in `src/shared/` — accessible to Main and Renderer
- [ ] `DevelopmentIntelligenceService` in Infrastructure — only in `src/main/`
- [ ] Dependency graph has zero cycles
- [ ] Every dependency points downward (Domain ← Infrastructure ← Presentation)

### 7.7 Build Pipeline

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — successful
- [ ] No new dependencies in `package.json`
- [ ] No new configuration files
- [ ] No new IPC channels (reuses existing Command IPC)

### 7.8 Documentation

- [ ] `architecture/17_DEVELOPMENT_INTELLIGENCE_IMPLEMENTATION.md` — this document, complete
- [ ] `docs/09_TODO.md` — M13 marked complete
- [ ] `docs/10_CHANGELOG.md` — M13 entry added
- [ ] No TODO placeholders in any new source file

### 7.9 Future Compatibility Verified

- [ ] `DevelopmentState` is agent-agnostic (zero runtime/agent identifiers)
- [ ] `DevelopmentState` contains all fields needed for Session Handoff
- [ ] `DevelopmentState` supports multi-agent working sets (via `milestoneId` scoping)
- [ ] `DevelopmentState` supports release checklist queries
- [ ] `DevelopmentState` supports dynamic Command Palette commands
- [ ] `FileClassifier` interface is swappable for plugin system
- [ ] No redesign of `DevelopmentState` required for any listed future subsystem

---

## 8. Files Summary

### New Files (12)

| File | Lines (est.) |
|---|---|
| `src/shared/development/types.ts` | ~200 |
| `src/main/development/types.ts` | ~15 |
| `src/main/development/DevelopmentIntelligenceService.ts` | ~100 |
| `src/main/development/WorkingSetEngine.ts` | ~80 |
| `src/main/development/FileClassifier.ts` | ~60 |
| `src/main/development/DocCouplingEngine.ts` | ~60 |
| `src/main/development/WarningAnalyzer.ts` | ~60 |
| `src/main/development/CompletionAnalyzer.ts` | ~40 |
| `src/main/development/CommitAnalyzer.ts` | ~60 |
| `src/main/development/RiskAnalyzer.ts` | ~40 |
| `src/main/development/ProjectActivity.ts` | ~40 |

### Modified Files (4)

| File | Change |
|---|---|
| `src/main/dashboard/DashboardService.ts` | Add optional DevIntel composition |
| `src/main/runtime/commands/handlers/DashboardHandler.ts` | Serve DevelopmentState |
| `src/renderer/stores/dashboard.ts` | Receive DevelopmentState in store |
| `src/renderer/components/Dashboard.tsx` | Pass DevelopmentState to children |

### Widget Updates (3)

| File | Change |
|---|---|
| `src/renderer/components/IsHealthy.tsx` | Render DevelopmentState.warnings |
| `src/renderer/components/TodaysRecommendation.tsx` | Read workingSet.isCommitReady |
| `src/renderer/components/CurrentMilestone.tsx` | Read completionEstimate |

### Documentation (3)

| File | Action |
|---|---|
| `architecture/17_DEVELOPMENT_INTELLIGENCE_IMPLEMENTATION.md` | This document (create) |
| `docs/09_TODO.md` | Mark M13 complete (update) |
| `docs/10_CHANGELOG.md` | Add M13 entry (update) |

---

## 9. Implementation Invariant

Throughout the entire construction order (Steps 1–10):

1. `npm run typecheck` must pass after every step.
2. `npm run build` must pass after every integration step (Steps 7–10).
3. No step introduces dead code that a later step must clean up.
4. No step modifies a file that a previous step "finished" — each module is written once and only patched for integration.
5. The construction order is linear — no parallel step depends on another parallel step's output.

---

This document is the construction contract. No implementation begins until it is accepted. After acceptance, each module is built in the exact order specified. Verification gates (typecheck, build) are run after every step. Deviation from this plan requires an amendment to this document.
