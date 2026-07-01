# Mission Control — Information Architecture Review

**Date:** 2026-06-30
**Scope:** Dashboard IA audit — five issues identified in current Mission Control
**Status:** Review only — no code changes

---

## 1. Roadmap Widget Shows Wrong Milestone Title (M11a instead of M11e)

### Observed Behavior

The Roadmap widget (CurrentMilestone component) displays:

```
Phase 3
M11
Metadata Index Foundation
```

But the active incomplete task is **M11e: Command Palette UI (Ctrl+P)**.

### Root Cause

`src/main/dashboard/TodoProvider.ts` — `findCurrentMilestone()` (lines 107-173)

The algorithm works like this:

1. Collects ALL tasks from every Sprint up to and including the first Sprint with incomplete tasks (lines 115-126).
2. Groups tasks by M-number prefix: `M1`, `M2`, ..., `M11`, `M12` (lines 131-139).
3. Finds the first M-group with incomplete tasks — that's `M11` (line 142).
4. Uses `tasks[0].description` as the milestone name (line 148-151).

The problem is step 4: `tasks[0]` in the M11 group is **M11a: Metadata Index Foundation** — which was completed in Sprint 3. The code takes the chronologically first task in the group, not the first **incomplete** task.

The M11 group contains (from Sprints 3 and 4):

```
[x] M11a   Metadata Index Foundation          ← tasks[0], COMPLETED
[x] M11b   Metadata Search Provider
[x] M11c   Command System Architecture Freeze
[x] M11c.5 Command System Architecture Verification
[x] M11d.1 Command Registry
[x] M11d.2 Command Executor
[ ] M11e   Command Palette UI (Ctrl+P)        ← first INCOMPLETE
[ ] M11f   Wire existing actions as Commands
```

### Also Affected

The `currentMilestone` field shows `"M11"` (the group prefix) instead of `"M11e"` (the specific incomplete task). This is a design choice — showing the group vs the task — but the name must come from the first incomplete task regardless.

### Recommended Fix

In `findCurrentMilestone()`, after identifying the M-group with incomplete tasks, find the first `!t.completed` task in that group and use its ID and description for `name`. Optionally use the specific task ID (e.g., `"M11e"`) for `currentMilestone` instead of the group prefix.

**File to change:** `src/main/dashboard/TodoProvider.ts:147-153`

---

## 2. Project Brain and Roadmap Disagree — Duplicate Source of Truth

### Observed Behavior

| Widget | Shows | Source |
|--------|-------|--------|
| Project Brain | `M11e — Command Palette UI (Ctrl+P)` | `BrainFocusSync.parseCurrentFocusFromTodo()` |
| Roadmap | `M11 / Metadata Index Foundation` | `TodoProvider.findCurrentMilestone()` |

Both read the same file (`docs/09_TODO.md`) but produce different results.

### Root Cause

There are **two independent TODO.md parsers** with different algorithms:

**Parser A — `TodoProvider.findCurrentMilestone()`** (for Roadmap)
- Groups all tasks by M-number prefix
- Finds first group with any incomplete task
- Uses chronological first task in group as the name
- Produces: `currentMilestone="M11"`, `currentMilestoneName="M11a: Metadata Index Foundation"`

**Parser B — `BrainFocusSync.parseCurrentFocusFromTodo()`** (for Project Brain)
- Finds the first Sprint block with incomplete tasks
- Matches the first `[ ] Mxx: ...` line in that block
- Produces: `milestone="M11e — Command Palette UI (Ctrl+P)"`

### Why This Happened

Parser A was written to support the Roadmap's milestone group/progress-bar display (show all M11 tasks with a progress bar). Parser B was written to produce the "current focus" for Project Brain. Both were implemented independently at different times (M12.6.6 added BrainFocusSync, TodoProvider existed earlier). The duplication was not recognized.

### The File on Disk Confirms the Discrepancy

`workspace/brain/current-focus.json` (written by BrainFocusSync):
```json
{
  "milestone": "M11e — Command Palette UI (Ctrl+P)",
  "sprint": "Sprint 4",
  "goal": "Phase 3 — Command System + Search UI (current)"
}
```

This is correct — it's the first incomplete task. The Roadmap shows stale data.

### Recommended Fix

**Single parser.** Extract TODO.md parsing into one shared function that produces a structured `TodoState`:

```typescript
interface TodoState {
  currentSprint: number;
  sprintGoal: string;
  firstIncompleteTask: { id: string; description: string } | null;
  milestoneGroups: Map<string, MilestoneGroup>;
  nextActions: NextAction[];
}
```

Both `TodoProvider` and `BrainFocusSync` should consume this single parser. The parser can live in a new file `src/main/dashboard/TodoParser.ts` or be extracted from existing TodoProvider logic.

**Files to change:**
- `src/main/dashboard/TodoProvider.ts` — consume shared parser
- `src/main/dashboard/BrainFocusSync.ts` — consume shared parser, remove duplicate parsing

---

## 3. Workspace Widget Always Shows "Index Not Yet Built"

### Observed Behavior

The Workspace widget permanently displays:

> Index not yet built.

Even though Workspace Explorer (tree + file preview) is fully functional.

### Root Cause

Two separate data paths exist:

1. **Workspace Explorer** — uses `workspaceService.listNodes(path)` directly via IPC. No index needed. Always works.
2. **Workspace Widget** — reads `projectState.workspaceIndex` which comes from `WorkspaceIndexStore.getStats()` → `this.lastStats`. This is `null` until `rebuild()` is called.

The index is never rebuilt automatically:

- `main/index.ts` line 23: `new WorkspaceIndexStore(workspaceService)` — created, but `rebuild()` is **never called**.
- `DashboardHandler.refresh()`: calls `this.indexStore?.getStats()` — returns `null`.
- `DashboardService.getProjectState()`: if `indexStats` is null, `workspaceIndex` field is omitted from the payload.
- `WorkspaceWidget.tsx`: `data?.workspaceIndex` is `undefined` → shows "Index not yet built."

The only way to populate the index is via the `workspace:index:rebuild` IPC handler (line 247-249) — which nothing calls automatically.

### Design Question

Should the index rebuild:

**Option A — On startup.**
`WorkspaceIndexStore` rebuilds during `app.whenReady()`. Pro: always available. Con: startup cost for large projects; index may go stale during a long session.

**Option B — On first Dashboard open.**
`DashboardHandler.refresh()` calls `this.indexStore.rebuild()` if no stats exist. Pro: lazy, only when needed. Con: first dashboard load is slow.

**Option C — Dashboard offers a "Build Index" button.**
Widget shows "Index not yet built — Build now" with a button. Pro: user controls cost. Con: extra click every session.

**Option D — Watcher-based incremental index.**
Use `fs.watch` to maintain index incrementally. Pro: always fresh, fast reads. Con: significantly more complexity (out of scope for current sprint).

### Recommendation

**Option B (lazy on first dashboard refresh)** — simplest change, zero UI churn, no startup cost. Add one line to `DashboardHandler.refresh()`:

```typescript
if (!this.indexStore?.getStats()) {
  this.indexStore?.rebuild();
}
```

Alternatively, trigger `rebuild()` in the handler constructor or during `workspaceService` initialization.

**File to change:** `src/main/runtime/commands/handlers/DashboardHandler.ts:35`

---

## 4. Health Widget Mixes Git Status with Build Status

### Current State Model

The `IsHealthy` component displays:

```
Health
  ✓ Working Tree  Clean
  Typecheck       Not yet checked  [Run now]
  Build           Not yet checked
```

Before checks run, everything is collapsed into a single "Not yet checked" message. After checks, typecheck and build get separate pass/fail lines.

### Problems

1. **"Not yet checked" is ambiguous** — it means "build/typecheck haven't run" but implies the Git health is also unknown (it's not — Git is always available).

2. **Single "Health" label conflates three independent concerns** — Git (repository), Build (compilation artifact), Typecheck (type safety). A dirty tree is a workflow concern, not a "health" concern in the same sense as a broken build.

3. **Checks require manual trigger** — the "Run now" button is the only entry point. Build/typecheck results from CI or pre-commit hooks are invisible.

### Recommended Model

Split into three clearly labeled rows within the same card:

```
Project Status

  Git Working Tree     Dirty  (31 modified, 12 untracked)
  TypeScript (tsc)     Unknown  [Run]
  Build (electron-vite) Unknown  [Run]
```

| Field | Source | Possible States | Always Available? |
|-------|--------|-----------------|-------------------|
| Git Working Tree | `GitProvider.getWorkingTree()` | Clean / Dirty (N modified, M untracked) | Yes |
| TypeScript (tsc) | `BuildProvider.runTypecheck()` | Pass / Fail / Unknown | No (requires execution) |
| Build (vite) | `BuildProvider.runBuild()` | Pass / Fail / Unknown | No (requires execution) |

Each row is independent. The "Run" button triggers both tsc + vite in sequence (as `runChecks()` already does), but each line shows its own status.

### Why This Matters

The Health widget should answer one question: **"Can I trust this project to build?"**

Currently it can't answer that without user action, and it bundles an unrelated concern (Git dirty/clean) under the same label.

**File to change:** `src/renderer/components/IsHealthy.tsx`

---

## 5. Full Mission Control Information Architecture

### Current Layout

```
┌─ DashboardHeader ──────────────────────────────────┐
│ AI Studio / Phase 3 · M11 · master                 │
├────────────────────────────────────────────────────┤
│                                                    │
│  CurrentMilestone  ("Where am I?")                 │
│  ├─ Phase 3 — Workspace Intelligence               │
│  ├─ M11 / Metadata Index Foundation  ← WRONG title │
│  ├─ Progress bar: M11d.1 M11d.2 M11e ...           │
│  └─ Git: branch, head, baseline                    │
│                                                    │
│  WorkspaceWidget                                   │
│  └─ "Index not yet built." ← NEVER populates       │
│                                                    │
│  IsHealthy                                         │
│  ├─ Working Tree: Dirty ✓                          │
│  └─ Build/Typecheck: Not yet checked               │
│                                                    │
│  TodaysRecommendation                              │
│  └─ "Continue M11 — ..."                           │
│                                                    │
│  ProjectBrain                                      │
│  ├─ Current Focus: M11e ← CORRECT                  │
│  ├─ Phase 3 · v0.2.0                               │
│  └─ 2 decisions, 4 layers                          │
│                                                    │
│  RecentActivity (collapsible)                      │
│  ├─ Git commits                                     │
│  └─ Recent sessions                                 │
└────────────────────────────────────────────────────┘
```

### Information Duplication

| Information | Widget 1 | Widget 2 | Widget 3 |
|-------------|----------|----------|----------|
| Current milestone | CurrentMilestone (wrong name) | ProjectBrain (correct name) | TodaysRecommendation (derived) |
| Phase + version | CurrentMilestone (phase) | ProjectBrain (phase + version) | DashboardHeader (derived) |
| Git status | CurrentMilestone (branch/head) | IsHealthy (dirty/clean) | RecentActivity (commits) |
| What to do next | TodaysRecommendation (computed) | (nextActions array exists but is invisible) | — |

### Unused Data

The `projectState.nextActions` array (extracted from TODO.md by `TodoProvider.getNextActions()`) is computed and sent to the renderer but **never displayed in any widget**. It contains the priority-ordered list of unchecked tasks from the current sprint.

### Recommended Layout

Each widget should answer **exactly one question** with no duplication:

```
┌─ DashboardHeader ──────────────────────────────────┐
│ AI Studio · Phase 3 · v0.2.0 · master              │
├────────────────────────────────────────────────────┤
│                                                    │
│  Current Milestone                                 │
│  Q: "What am I working on right now?"              │
│  └─ M11e — Command Palette UI (Ctrl+P)             │
│     Sprint 4 · Phase 3 · Workspace Intelligence    │
│     ┌──────────────────────────────────┐           │
│     │ ████████████░░░░░░ 6/8 complete  │           │
│     └──────────────────────────────────┘           │
│                                                    │
│  Next Actions                                      │
│  Q: "What should I do next?"                       │
│  └─ 1. M11e: Command Palette UI (Ctrl+P) ← active  │
│     2. M11f: Wire existing actions as Commands     │
│     3. M12: Code Manipulation Foundation           │
│     (from projectState.nextActions, not computed)  │
│                                                    │
│  Workspace                                         │
│  Q: "What's in this project?"                      │
│  └─ 156 files / 42 directories / indexed 14:32     │
│     (lazy-indexed on first dashboard open)         │
│                                                    │
│  Project Status                                    │
│  Q: "Can I trust this project to build?"           │
│  └─ Git:     Dirty (31 modified, 12 untracked)     │
│     tsc:     Unknown  [Run checks]                 │
│     vite:    Unknown  [Run checks]                 │
│                                                    │
│  Project Context                                   │
│  Q: "What are the key facts about this project?"   │
│  └─ 4 layers · 2 decisions                         │
│     (no milestone — moved to Current Milestone)    │
│                                                    │
│  Recent Activity  (collapsible, unchanged)         │
│  Q: "What happened recently?"                      │
│  └─ Commits + sessions                             │
└────────────────────────────────────────────────────┘
```

### Key Changes from Current

1. **Current Milestone** — shows the specific incomplete task (M11e), not the M-group. Progress bar still shows all M11 tasks. This is the single source of truth for "what am I working on?"

2. **Next Actions** (NEW widget, or merge into TodaysRecommendation) — renders the already-computed `projectState.nextActions` array. No more hidden data. This replaces the current TodaysRecommendation's computed message with concrete TODO.md tasks.

3. **Workspace** — lazy-indexes on first dashboard open. Shows file/directory counts.

4. **Project Status** (renamed from Health) — three independent rows: Git / tsc / vite. Each has its own status indicator. "Run checks" button runs both tsc+vite.

5. **Project Context** (renamed from Project Brain) — drops the milestone field (moved to Current Milestone). Shows only project-level facts: architecture layers, decisions count, version.

6. **Recent Activity** — unchanged.

### Removing the `currentFocus` Duplication

After this reorganization, `BrainCurrentFocus.milestone` becomes redundant — the same data is in `MilestoneProgress.currentMilestone` (once fixed per Issue 1). The `BrainFocusSync` can stop computing milestone and focus only on persistent brain data (project/architecture/decisions). The `current-focus.json` file still serves a purpose for external AI agents reading the workspace, but the Dashboard no longer needs to display it.

---

## Recommended Implementation Order

| Priority | Issue | Files | Effort | Rationale |
|----------|-------|-------|--------|-----------|
| **P0** | Issue 1 — Fix Roadmap milestone name | `TodoProvider.ts:147-153` | Small | User-visible bug: shows wrong milestone title |
| **P0** | Issue 2 — Unify TODO.md parsing | New `TodoParser.ts`, modify `TodoProvider.ts`, `BrainFocusSync.ts` | Medium | Fixes root cause of Issue 1 + prevents future drift |
| **P1** | Issue 4 — Split Health into Git/tsc/vite | `IsHealthy.tsx` | Small | Clean separation, no data model changes needed |
| **P1** | Issue 3 — Auto-index on first dashboard open | `DashboardHandler.ts:35` | Tiny | One-line fix, makes Workspace widget functional |
| **P2** | Issue 5 — Surface nextActions + reorder layout | `Dashboard.tsx`, `TodaysRecommendation.tsx`, new `NextActions` widget | Medium | IA redesign — should follow P0/P1 fixes |

**P0** should be done together (Issue 2 subsumes Issue 1). **P1** items are independent and can be done in either order. **P2** is the IA polish pass after the data pipeline is correct.
