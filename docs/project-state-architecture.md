# ProjectState Architecture — Frozen Rules

Status: Architecture Freeze
Date: 2026-06-30
Reference: `src/main/dashboard/types.ts` (ProjectState, ProjectStatus)
Sprint: 4 — Phase 3 — Command System + Search UI

---

## Purpose

`ProjectState` is the single unified Dashboard payload. Every piece of
Dashboard data flows through `DashboardService` into ONE `ProjectState`
object. The Renderer receives this object and renders it — without ever
knowing which Provider produced each field.

This document freezes the architectural rules that govern `ProjectState`
composition and consumption. No code change may violate these rules.

---

## Frozen Rules

### Rule 1: ProjectState is composed ONLY by DashboardService

```text
DashboardService.getProjectState() → ProjectState
```

- No other class or module may assemble a `ProjectState`.
- Providers return their own domain types (e.g., `WorkingTree`,
  `BrainData`, `MilestoneProgress`).
- `DashboardService` alone composes these into the unified
  `ProjectState`.

### Rule 2: Providers own only their own domains

- `GitProvider` → `WorkingTree`, `RecentActivity`, baseline, branch
- `TodoProvider` → `MilestoneProgress`, `NextAction[]`
- `BrainProvider` → `BrainData`
- `BuildProvider` → `BuildStatus`
- `SessionProvider` → recent sessions
- `ProjectInfoProvider` → `ProjectInfo`

Each Provider reads its own source (git, filesystem, config) and
returns its own domain types. No Provider may import or consume
another Provider.

### Rule 3: Providers never consume other Providers

This follows from Rule 2. No cross-Provider dependency. If data
from two sources must be combined, `DashboardService` does it.

Example: `MilestoneProgress` is enriched with git data (baseline,
branch, headCommit) by `DashboardService`, not by `TodoProvider`.

### Rule 4: Widgets never derive ProjectState

Widgets (React components in `src/renderer/components/`) receive
`ProjectState` as a prop and **only render it**.

A widget must never:
- Compute a recommendation from `workingTree.isClean` + `milestone`
- Derive health status from `build` + `workingTree`
- Combine fields to produce a new interpretation

Any derived state (recommendations, health summaries, status) is
pre-computed by `DashboardService` and stored in
`ProjectState.status` (see `ProjectStatus`).

### Rule 5: Widgets only render ProjectState

The only responsibility of a Dashboard widget is to map
`ProjectState` (and its pre-computed children like `ProjectStatus`)
to UI elements.

Widgets may:
- Read fields from `ProjectState` (or `ProjectState.status`)
- Map enum values to i18n strings (e.g., `recommendationType` → text)
- Apply conditional styling based on enum values (e.g., color for
  `"warning"` vs `"info"`)

Widgets must not:
- Evaluate conditions on raw data fields to decide what to show
- Compute new values from multiple `ProjectState` fields
- Interpret status differently than how `DashboardService` computed it

---

## Data Flow

```text
┌─────────────┐
│   Git       │──→ GitProvider ──→ WorkingTree, Baseline, RecentCommits
│   TODO.md   │──→ TodoProvider ──→ MilestoneProgress, NextAction[]
│   brain/    │──→ BrainProvider ──→ BrainData
│   npm       │──→ BuildProvider ──→ BuildStatus
│   SessionDB │──→ SessionProvider ──→ RecentSessions
│   Config    │──→ ProjectInfoProvider ──→ ProjectInfo
└─────────────┘
                    │
                    ▼
          DashboardService.compose()
                    │
                    ▼
             ProjectState {
               project, milestone, workingTree,
               nextActions, brain, build,
               recent, workspaceIndex,
               status: ProjectStatus      ← pre-computed, never re-derived
             }
                    │
                    ▼
          Widgets (render only)
```

---

## Status Pre-Computation

`ProjectStatus` is computed ONCE by `DashboardService.computeStatus()`:

```typescript
interface ProjectStatus {
  workingTree: WorkingTree | null;
  build: BuildStatus;
  recommendationType: "dirty-tree" | "continue-milestone" | "ready-for-next";
  recommendationContext: string;
}
```

The recommendation is determined by `DashboardService` from the
combined state of `workingTree` and `milestone`. Widgets receive the
pre-computed `recommendationType` and map it to i18n text — they
perform no logic beyond the mapping.

---

## Deprecated: DashboardRawData

`DashboardRawData` is retained for backward compatibility with legacy
IPC callers. It is marked `@deprecated` in both main and renderer
type definitions.

Once all callers have migrated to `ProjectState` and the migration is
verified, `DashboardRawData` will be removed.

Current legacy callers:
- `DashboardService.getData()` (itself deprecated, delegates to
  `getProjectState()` internally)
- `Window.api.dashboard.getData()` in renderer IPC API (kept for
  compatibility with any external consumers)

---

## Related Files

| File | Role |
|---|---|
| `src/main/dashboard/types.ts` | ProjectState, ProjectStatus, and legacy DashboardRawData definitions |
| `src/main/dashboard/DashboardService.ts` | Sole composer of ProjectState |
| `src/main/dashboard/TodoParser.ts` | Pure parser — no FS, no Provider dependencies |
| `src/main/dashboard/TodoProvider.ts` | FS I/O only — delegates parsing to TodoParser |
| `src/renderer/env.d.ts` | Renderer-side type mirrors (widgets use these) |
| `src/renderer/components/Dashboard.tsx` | Root Dashboard widget |
| `src/renderer/components/IsHealthy.tsx` | Health widget — renders status, never derives |
| `src/renderer/components/TodaysRecommendation.tsx` | Recommendation widget — renders pre-computed status |
