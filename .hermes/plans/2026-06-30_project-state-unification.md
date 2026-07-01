# ProjectState Unification Refactor — Implementation Plan

> **For Hermes:** Execute task-by-task, verifying each commit before proceeding.

**Goal:** Mission Control has exactly ONE source of truth. All TODO.md parsing goes through a single `TodoParser`. `ProjectState` is the only Dashboard data model. Milestone selection shows the first unchecked task, not the first task of the group. WorkspaceIndexStore does lazy rebuild. Build health splits into independent status entries.

**Architecture:** Extract shared `TodoParser` → refactor `TodoProvider`, `BrainFocusSync`, and `ProjectState` to consume it → remove `DashboardRawData` and `getData()` legacy path → fix milestone selection → add lazy index rebuild → split `BuildStatus` into 4 independent entries → document.

**Tech Stack:** TypeScript, Electron, Zustand, no new dependencies.

---

## Task 1: Create shared TodoParser

**Objective:** Extract ALL TODO.md parsing logic into a single pure-function parser module.

**Files:**
- Create: `src/main/dashboard/TodoParser.ts`
- Modify: (none yet — this is a new file, no consumers changed)

**Step 1: Write the module**

Create `src/main/dashboard/TodoParser.ts` with these exports:

```typescript
// ============================================================
// TodoParser — single source of truth for docs/09_TODO.md parsing.
// All providers (TodoProvider, BrainFocusSync, future
// DevelopmentIntelligence) consume the same parsed model.
// Pure functions. No filesystem I/O inside (caller provides text).
// ============================================================

// Structured milestone ID: M<num>[letter][.num][letter]
const MILESTONE_ID_RE = /M\d+(?:[a-z](?:\.\d+)?|\.\d+[a-z]?)?/;

/** A single task line from TODO.md. */
export interface ParsedTask {
  id: string;           // e.g. "M11e"
  rawId: string;        // full match: "M11e"
  description: string;  // e.g. "Command Palette UI (Ctrl+P)"
  completed: boolean;
}

/** A sprint block with its index and tasks. */
export interface ParsedSprint {
  index: number;        // 1-based
  tasks: ParsedTask[];
}

/** The complete parsed TODO.md model. */
export interface ParsedTodo {
  phase: string;                 // e.g. "3"
  phaseLabel: string;            // e.g. "Phase 3 — Workspace Intelligence"
  sprints: ParsedSprint[];
}

// ----------------------------------------------------------
// Public API
// ----------------------------------------------------------

/**
 * Parse the full text of docs/09_TODO.md into a structured model.
 * Caller is responsible for reading the file and providing UTF-8 text.
 */
export function parseTodo(text: string): ParsedTodo {
  const phase = extractPhase(text);
  const phaseLabelMatch = text.match(/Phase \d+\s*[—–-]\s*(.+)/);
  const phaseLabel = phaseLabelMatch
    ? `Phase ${phase} — ${phaseLabelMatch[1]!.trim()}`
    : `Phase ${phase}`;

  const sprintBlocks = text.split(/# Sprint \d+\r?\n/).slice(1);
  const sprints: ParsedSprint[] = sprintBlocks.map((block, i) => ({
    index: i + 1,
    tasks: parseTasks(block),
  }));

  return { phase, phaseLabel, sprints };
}

/**
 * Find the current sprint — the first sprint with incomplete tasks.
 * Returns the sprint and its 0-based block index.
 */
export function findCurrentSprint(sprints: ParsedSprint[]): {
  sprint: ParsedSprint;
  blockIdx: number;
} | null {
  for (let i = 0; i < sprints.length; i++) {
    if (sprints[i]!.tasks.some((t) => !t.completed)) {
      return { sprint: sprints[i]!, blockIdx: i };
    }
  }
  return null;
}

/**
 * Get the FIRST unchecked task of a sprint (not the first task of the
 * first incomplete group). This is what "Current Planned Milestone"
 * should display.
 */
export function getFirstUncheckedTask(sprint: ParsedSprint): ParsedTask | null {
  for (const task of sprint.tasks) {
    if (!task.completed) return task;
  }
  return null;
}

/**
 * Get all unchecked tasks from a sprint, or from the current sprint
 * across all sprints.
 */
export function getUncheckedTasks(sprint: ParsedSprint): ParsedTask[] {
  return sprint.tasks.filter((t) => !t.completed);
}

// ----------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------

function extractPhase(text: string): string {
  const m = text.match(/Phase (\d+)/);
  return m ? m[1]! : "1";
}

function parseTasks(block: string): ParsedTask[] {
  // Match task lines: * [x] or * [ ] then M-identifier then description
  const TASK_RE = new RegExp(
    `\\* \\[([ x])\\] (${MILESTONE_ID_RE.source}): (.+)`,
    "g"
  );
  const tasks: ParsedTask[] = [];
  let match: RegExpExecArray | null;
  while ((match = TASK_RE.exec(block)) !== null) {
    tasks.push({
      id: match[2]!,
      rawId: match[2]!,
      description: match[3]!.trim(),
      completed: match[1] === "x",
    });
  }
  return tasks;
}
```

**Verification:** File compiles without errors. No consumers changed — this is a standalone module.

---

## Task 2: Refactor TodoProvider to use TodoParser

**Objective:** Replace all inline parsing in `TodoProvider.ts` with calls to `parseTodo()`.

**Files:**
- Modify: `src/main/dashboard/TodoProvider.ts`

**Changes:**

1. Import `parseTodo`, `findCurrentSprint`, `getFirstUncheckedTask`, `getUncheckedTasks` from `./TodoParser.js`
2. Replace `getMilestoneProgress()` to use parser:
   - Call `parseTodo(text)`
   - Call `findCurrentSprint(parsed.sprints)`
   - Get `getFirstUncheckedTask(currentSprint.sprint)` — this is the "current milestone"
   - The `currentMilestone` field = `firstUnchecked.id` (e.g. "M11e")
   - The `currentMilestoneName` field = `firstUnchecked.description` (e.g. "Command Palette UI (Ctrl+P)")
   - `milestoneTasks` = all tasks in the current sprint (not grouped by M-number)
   - `milestoneProgress` = `${completed}/${total} complete` for the sprint's tasks

3. Replace `getNextActions()` to use parser:
   - Call `parseTodo(text)`
   - Call `findCurrentSprint(parsed.sprints)`
   - Use `getUncheckedTasks(currentSprint.sprint)` as next actions

4. Remove all private helper methods that are now in TodoParser:
   - Remove `extractPhase()`, `parseTasks()`, `findCurrentMilestone()`
   - Remove `MILESTONE_ID_RE`, `taskPattern()`, `ANY_TASK_RE`

**Key behavioral change:** The milestone displayed changes from:
- OLD: "M11" — "Metadata Index Foundation" (first task of first incomplete M-group)
- NEW: "M11e" — "Command Palette UI (Ctrl+P)" (first unchecked task in current sprint)

**Verification:** Run `npm run typecheck` to ensure no type errors.

---

## Task 3: Refactor BrainFocusSync to use TodoParser

**Objective:** Replace standalone parsing in `BrainFocusSync.ts` with calls to `parseTodo()`.

**Files:**
- Modify: `src/main/dashboard/BrainFocusSync.ts`

**Changes:**

1. Import `parseTodo`, `findCurrentSprint`, `getFirstUncheckedTask` from `./TodoParser.js`
2. Replace the inline parsing in `parseCurrentFocusFromTodo()`:
   - Call `parseTodo(text)`
   - Call `findCurrentSprint(parsed.sprints)`
   - Use `getFirstUncheckedTask(currentSprint.sprint)` for `currentMilestone`
   - Get sprint goal from the first non-empty, non-task line of the sprint block (keep existing logic but driven from `text.split(/# Sprint \d+\r?\n/)[currentSprint.blockIdx]`)

3. Remove now-unused local regexes:
   - Remove `MILESTONE_ID_RE`, `taskLineRe()`

**Verification:** Run `npm run typecheck`. The `currentFocus.milestone` field should now match TodoProvider's output.

---

## Task 4: Remove DashboardRawData and getData() legacy path

**Objective:** Eliminate `DashboardRawData` from types, remove `getData()` from `DashboardService`, remove `DashboardRawData` from renderer env.d.ts, clean up legacy IPC handlers.

**Files:**
- Modify: `src/main/dashboard/types.ts` — remove `DashboardRawData` interface
- Modify: `src/main/dashboard/DashboardService.ts` — remove `getData()` method (keep `getProjectState()` only)
- Modify: `src/renderer/env.d.ts` — remove `DashboardRawData` interface and `dashboard.getData` from Window.api
- Modify: `src/main/index.ts` — remove `dashboard:get-data` IPC handler
- Modify: `src/preload/index.ts` — remove `getData` from dashboard bridge

Wait — let me check preload first before writing this task.

Actually let me check the preload first, then write the exact steps. But I already know the pattern. Let me add inspection step.

**Step 0: Check preload/index.ts for dashboard.getData usage**

Read `src/preload/index.ts` and identify the `getData` bridge method. Remove it.

**Changes in `src/main/dashboard/types.ts`:**
- Delete lines 58–65 (`DashboardRawData` interface and its comment block)
- The `ProjectState` interface (lines 164–181) remains — it is the sole data model

**Changes in `src/main/dashboard/DashboardService.ts`:**
- Delete the `getData()` method (lines 138–178)
- Delete the import of `DashboardRawData` from `./types.js`
- Remove `toIndexSnapshot` private method if it's only used by `getData()` — but wait, `getProjectState()` also calls it. Keep it for now. Actually `getProjectState` calls it too (line 110). Keep it.
- Remove the `runValidation` and `logReport` methods if they're only called from `getData()` — check. Actually `runValidation` is also called from `getProjectState()` (line 122). Keep it.

**Changes in `src/renderer/env.d.ts`:**
- Delete lines 50–86 (`DashboardRawData` interface)
- Delete `getData` from the `dashboard` block (line 202)

**Changes in `src/main/index.ts`:**
- Delete lines 175–177 (`dashboard:get-data` IPC handler)

**Changes in `src/preload/index.ts`:**
- Need to inspect first. Will remove `getData` method.

**Verification:** Run `npm run typecheck`. No references to `DashboardRawData` or `getData` should remain.

---

## Task 5: Ensure all widgets read from ProjectState only

**Objective:** Verify every Dashboard widget receives `ProjectState | null` and never derives milestone/brain from any other source. Clean up the `build` field split from ProjectState.

**Files to inspect/modify:**
- `src/renderer/components/IsHealthy.tsx` — currently receives both `data: ProjectState` AND `build: DashboardBuildStatus` (separate). Needs refactoring to read build status entries from `ProjectState`.
- `src/renderer/components/Dashboard.tsx` — passes `build` as separate prop
- `src/renderer/stores/dashboard.ts` — has separate `build` state alongside `projectState`

**Analysis:** The current design has `ProjectState.build` (typecheck + build combined) AND a separate `dashboardStore.build` which is populated by `refreshBuild()`. These are two separate build statuses — one from the initial refresh, one from the explicit "Run Checks" button.

For this refactor:
- `ProjectState.build` becomes the canonical build status
- `refreshBuild()` should update `projectState.build` in-place, not a separate field
- OR: add explicit `gitStatus`, `workspaceIndexStatus`, `typecheckStatus`, `buildStatus` fields to `ProjectState`

Per requirement #5: "Replace the current mixed Health model with independent status entries: Git, Workspace Index, Typecheck, Build. Each entry owns its own state."

So we need to:
1. Add 4 new status types to `ProjectState`
2. Each status entry has its own independent state

**Files:**
- Modify: `src/main/dashboard/types.ts` — add `StatusEntry` type and 4 fields to `ProjectState`, remove `build: BuildStatus`
- Modify: `src/main/dashboard/DashboardService.ts` — populate the 4 status entries
- Modify: `src/renderer/env.d.ts` — update `ProjectState` to include the 4 status entries
- Modify: `src/renderer/stores/dashboard.ts` — remove separate `build` field, use `projectState` fields
- Modify: `src/renderer/components/IsHealthy.tsx` — render the 4 independent entries
- Modify: `src/renderer/components/Dashboard.tsx` — stop passing separate `build` prop

**New types in `src/main/dashboard/types.ts`:**

```typescript
export type StatusState = "pass" | "fail" | "unknown" | "loading";

export interface StatusEntry {
  state: StatusState;
  /** Human-readable label for the current state. */
  label: string;
  /** Optional detail (e.g. "31 modified, 13 untracked"). */
  detail?: string;
  /** Last time this status was updated (epoch ms). */
  lastChecked: number;
}

export interface ProjectStatus {
  git: StatusEntry;
  workspaceIndex: StatusEntry;
  typecheck: StatusEntry;
  build: StatusEntry;
}
```

**Update `ProjectState`:** Replace `build: BuildStatus` with `status: ProjectStatus`.

**Changes in `DashboardService.ts`:**
- `getProjectState()`: populate `status` entries:
  - `git`: from `GitProvider.getWorkingTree()` — clean/dirty
  - `workspaceIndex`: from `WorkspaceIndexStore.getStats()` — present/missing
  - `typecheck`: starts as "unknown", updated by `runChecks()`
  - `build`: starts as "unknown", updated by `runChecks()`
- `runChecks()`: returns `ProjectStatus` instead of `BuildStatus`

**Changes in `IsHealthy.tsx`:**
- Accept only `data: ProjectState | null`
- Read `data.status.git`, `data.status.workspaceIndex`, `data.status.typecheck`, `data.status.build`
- Each row is a `StatusRow` with its own icon and state
- No more separate `build` prop

**Verification:** Run `npm run typecheck`. Dashboard renders 4 status entries with independent states.

---

## Task 6: Lazy rebuild in WorkspaceIndexStore

**Objective:** `WorkspaceIndexStore` performs a lazy rebuild on first request (getStats/getAll/findByPath/findByName) if no index exists.

**Files:**
- Modify: `src/main/workspace/WorkspaceIndexStore.ts`

**Changes:**

Add a private `_built` flag (false initially). Add a private `ensureIndex()` method:

```typescript
private _built = false;

private ensureIndex(): void {
  if (!this._built) {
    this.rebuild();
    this._built = true;
  }
}
```

Modify `getAll()`, `getStats()`, `findByPath()`, `findByName()`:
```typescript
getAll(): IndexEntry[] {
  this.ensureIndex();
  return this.entries;
}

getStats(): IndexStats | null {
  this.ensureIndex();
  return this.lastStats;
}

findByPath(path: string): IndexEntry | undefined {
  this.ensureIndex();
  return this.entries.find((e) => e.path === path);
}

findByName(query: string): IndexEntry[] {
  this.ensureIndex();
  const q = query.toLowerCase();
  return this.entries.filter((e) => e.name.toLowerCase().includes(q));
}
```

`rebuild()` stays public for explicit rebuilds and should set `_built = true` after completing.

**Also:** Remove explicit `rebuild()` call from `DashboardService` if it exists there — the Dashboard should never explicitly trigger rebuild. Looking at code, `DashboardService.getProjectState()` receives `indexStats` as a parameter (passed from `DashboardHandler` which reads `this.indexStore?.getStats()`). This is already lazy — `getStats()` will auto-trigger rebuild. No change needed in DashboardService.

**Verification:** Run `npm run typecheck`. First access to any query method triggers rebuild automatically.

---

## Task 7: Remove Dashboard explicit index rebuild trigger

**Objective:** Ensure Dashboard never explicitly calls `workspaceIndexStore.rebuild()`. 

**Inspection:** Looking at code:
- `src/main/index.ts` line 247-249: `workspace:index:rebuild` IPC handler calls `workspaceIndexStore.rebuild()` — this is for explicit manual rebuild, keep it (it's a user action, not automatic).
- `DashboardHandler.refresh()` calls `this.indexStore?.getStats()` which will now auto-rebuild. Good.
- `DashboardService.getProjectState()` receives `indexStats` parameter. Good.

No explicit rebuild trigger from Dashboard. The IPC `workspace:index:rebuild` is an explicit user action path, not auto-triggered. Keep it per requirement: "Dashboard must never explicitly trigger rebuild."

**Files:** No changes needed — already compliant.

---

## Task 8: Write architecture documentation

**Objective:** Produce `docs/project-state-architecture.md` explaining the unified architecture.

**Files:**
- Create: `docs/project-state-architecture.md`

**Content to cover:**

```markdown
# ProjectState Architecture

## Overview

ProjectState is the single unified Dashboard data model. Every Mission Control
widget reads from ProjectState. No widget derives or reinterprets milestone
information independently.

## ProjectState

The canonical shape (defined in `src/main/dashboard/types.ts`):

| Field | Source | Description |
|-------|--------|-------------|
| `project` | ProjectInfoProvider | Workspace identity + git snapshot |
| `milestone` | TodoParser → TodoProvider | First unchecked task of current sprint |
| `workingTree` | GitProvider | Dirty/clean + modified/untracked counts |
| `nextActions` | TodoParser → TodoProvider | Priority-ordered unchecked tasks |
| `brain` | BrainProvider | Long-term AI context from workspace/brain/ |
| `status` | Multiple providers | 4 independent status entries |
| `recent` | GitProvider + SessionProvider | Recent commits and sessions |
| `workspaceIndex` | WorkspaceIndexStore | Lazy-built file/directory counts |

## TodoParser

`src/main/dashboard/TodoParser.ts` — the single source of truth for TODO.md parsing.

All parsing of `docs/09_TODO.md` goes through this module:
- `parseTodo(text)` → `ParsedTodo` model
- `findCurrentSprint(sprints)` → first sprint with incomplete tasks
- `getFirstUncheckedTask(sprint)` → the single next milestone to display

Consumers:
- `TodoProvider` — Dashboard milestone + next actions
- `BrainFocusSync` — current-focus.json sync
- Future: `DevelopmentIntelligence` — progress analytics

## Provider Ownership

| Provider | Owns | Depends on |
|----------|------|-----------|
| `TodoParser` | Parsing logic | (none — pure functions) |
| `TodoProvider` | Milestone + next actions from TODO.md | `TodoParser` |
| `BrainFocusSync` | current-focus.json sync | `TodoParser` |
| `BrainProvider` | Brain data CRUD | `BrainFocusSync` |
| `GitProvider` | Git status + commits | `git` CLI |
| `BuildProvider` | Typecheck + build execution | `npm` CLI |
| `SessionProvider` | Session listing | Session store |
| `DashboardService` | Composing ProjectState | All providers |
| `WorkspaceIndexStore` | File/directory index | `WorkspaceIndexer` |

## Data Flow

```
docs/09_TODO.md
    ↓ (readFileSync)
TodoParser.parseTodo(text)
    ↓ (ParsedTodo)
    ├── TodoProvider.getMilestoneProgress() → milestone
    ├── TodoProvider.getNextActions() → nextActions
    └── BrainFocusSync.parseCurrentFocusFromTodo() → current-focus.json

git CLI
    ↓ (execSync)
GitProvider → workingTree, recent.commits, milestone.baseline

workspace/brain/*.json
    ↓ (readFileSync)
BrainProvider.getBrainData() → brain

npm CLI
    ↓ (exec)
BuildProvider → status.typecheck, status.build

WorkspaceIndexStore (lazy)
    ↓ (getStats on first access)
WorkspaceIndexSnapshot → workspaceIndex

DashboardService.getProjectState()
    ↓
ProjectState (single object)
    ↓ (IPC: dashboard.refresh)
DashboardStore.projectState
    ↓ (React props)
Widgets: CurrentMilestone, IsHealthy, WorkspaceWidget, etc.
```

## Widget Ownership

Every widget receives `ProjectState | null` as its `data` prop:

| Widget | Reads `projectState.` | Never accesses |
|--------|----------------------|----------------|
| `CurrentMilestone` | `milestone` | (no other sources) |
| `IsHealthy` | `status.git`, `status.workspaceIndex`, `status.typecheck`, `status.build` | (no other sources) |
| `WorkspaceWidget` | `workspaceIndex` | (no other sources) |
| `TodaysRecommendation` | `workingTree`, `milestone` | (no other sources) |
| `RecentActivity` | `recent` | (no other sources) |

No widget calls `TodoProvider`, `GitProvider`, or any other provider directly.
No widget derives milestone information independently.

## Future Compatibility: Development Intelligence

The `TodoParser` module and `ProjectState` model are designed for extension:
- `DevelopmentIntelligence` service will consume `ParsedTodo` from `TodoParser` (no duplicate parsing)
- `ProjectState` can receive additional fields (e.g., `devIntelligence`, `tokenUsage`) without breaking existing widgets
- The `status` entries in `ProjectState` can be extended with additional diagnostic entries
```

**Verification:** Document is clear, covers all 6 requirements, and serves as reference for future Development Intelligence work.

---

## Task 9: Final verification

**Objective:** Full build + typecheck + manual verification of milestone display.

**Commands:**
```bash
npm run typecheck
npm run build
```

**Expected:** Zero type errors. Build succeeds.

**Manual check:** The Dashboard should display:
- "M11e" as current milestone (not "M11")
- "Command Palette UI (Ctrl+P)" as milestone name (not "Metadata Index Foundation")
- 4 independent status entries for Git, Workspace Index, Typecheck, Build
- Workspace index auto-built on first Dashboard load (no explicit rebuild button needed)
```

