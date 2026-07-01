# Dashboard Data Validation — M12.6.6

Validation document for the Mission Control data pipeline repair.

## Before (M12.6.5)

### Parser Issues

| Issue | Symptom |
|-------|---------|
| CRLF line endings | `\n`-only splits failed on CRLF `docs/09_TODO.md`. Sprint blocks and task regex silently missed content. |
| Milestone ID regex | `M\d+[a-z]?` did not match `M9.5`, `M10.8a`, `M11d.2`. These tasks were invisible to the parser. |
| Milestone grouping | `t.id.match(/^M(\d+)/)` grouped all sub-milestones under the numeric root (M11d.1, M11d.2, M11e → all "M11"). Name derivation used stale regex. |

### Brain Sync Issues

| Issue | Symptom |
|-------|---------|
| In-memory only | `parseCurrentFocusFromTodo()` returned a value but never wrote `workspace/brain/current-focus.json`. Brain displayed stale data. |
| Seed-only write | `BrainProvider.seedCurrentFocus()` wrote the file on first access only. Subsequent TODO.md changes were never persisted to Brain. |

### Data Assembly Issues

| Issue | Symptom |
|-------|---------|
| 3 separate payloads | DashboardHandler returned `{ data, projectInfo, brainData }` — three unrelated objects assembled by the renderer. |
| No single source of truth | Dashboard component received `data`, `projectInfo`, and `brainData` from separate store fields. Components could diverge. |

---

## After (M12.6.6)

### Parser Fixes

1. **CRLF-compatible**: All `split(/# Sprint \d+\n/)` → `split(/# Sprint \d+\r?\n/)`. Internal line splits use `/\r?\n/`.

2. **Structured milestone ID**: Single regex constant `MILESTONE_ID_RE` matches all formats:

```
M9          → M\d+
M9a         → M\d+[a-z]
M9.5        → M\d+\.\d+
M10.8a      → M\d+\.\d+[a-z]
M11d.2      → M\d+[a-z]\.\d+
M12c        → M\d+[a-z]
```

Pattern: `M\d+(?:[a-z](?:\.\d+)?|\.\d+[a-z]?)?`

3. **Dynamic task regex**: `taskPattern(mark)` and `ANY_TASK_RE` built from the structured ID constant. Name stripping uses the same constant.

### Brain Sync Fix

4. **Always-write**: `parseCurrentFocusFromTodo()` calls `writeFocusFile()` on every successful parse. `workspace/brain/current-focus.json` is always in sync with TODO.md.

5. **Single source**: `BrainProvider.readCurrentFocus()` always calls `parseCurrentFocusFromTodo()` first. File read is a fallback only when TODO.md is unavailable.

### Data Assembly Fix

6. **ProjectState**: Single `ProjectState` interface in `src/main/dashboard/types.ts`. Contains:
   - `project`: ProjectInfo (git identity + workspace snapshot)
   - `milestone`: MilestoneProgress (from TodoProvider + GitProvider)
   - `workingTree`: WorkingTree (from GitProvider)
   - `nextActions`: NextAction[] (from TodoProvider)
   - `brain`: BrainData (from BrainProvider, auto-synced)
   - `build`: BuildStatus (typecheck + build)
   - `recent`: RecentActivity (commits + sessions)
   - `workspaceIndex?`: WorkspaceIndexSnapshot

7. **Single payload**: `dashboard.refresh` returns `{ projectState }` instead of `{ data, projectInfo, brainData }`.

---

## Parsed TODO Verification

Run `getProjectState()` and verify against `docs/09_TODO.md`:

| Field | Expected Source | Check |
|-------|----------------|-------|
| `projectState.milestone.phase` | `Phase \d+` in TODO.md | Match |
| `projectState.milestone.currentMilestone` | First incomplete M-group (e.g., "M11") | Match |
| `projectState.milestone.milestoneTasks` | All tasks in current milestone group | Count matches |
| `projectState.milestone.milestoneProgress` | `completed/total complete` | Correct ratio |
| `projectState.nextActions` | Open `* [ ]` tasks in current Sprint | Match |
| `projectState.brain.currentFocus.milestone` | Same as `milestone.currentMilestone` + name | **Must match** |

### Test Cases

Execute programmatically or mentally:

```
TODO.md line: `* [ ] M11e: Command Palette UI (Ctrl+P)`

Parsed:
  id:       "M11e"
  description: "M11e: Command Palette UI (Ctrl+P)"
  completed: false
  milestone group: "M11"  ← numeric root for grouping
```

```
TODO.md line: `* [x] M11d.1: Command Registry`

Parsed:
  id:       "M11d.1"
  description: "M11d.1: Command Registry"
  completed: true
  milestone group: "M11"
```

```
TODO.md line: `* [x] M10.8a: Workspace UX architecture freeze`

Parsed:
  id:       "M10.8a"
  description: "M10.8a: Workspace UX architecture freeze"
  completed: true
  milestone group: "M10"
```

---

## ProjectState Verification

After `dashboardService.getProjectState()`:

| Field | Assertion |
|-------|-----------|
| `projectState.project` | Non-null, has projectName, branch, etc. |
| `projectState.milestone` | Non-null if TODO.md exists |
| `projectState.milestone?.baseline.tag` | Matches `git describe --tags --abbrev=0` |
| `projectState.milestone?.branch` | Matches `git rev-parse --abbrev-ref HEAD` |
| `projectState.workingTree` | Non-null |
| `projectState.nextActions` | Length ≥ 0 |
| `projectState.brain?.currentFocus.milestone` | Non-empty if TODO.md has active tasks |
| `projectState.build.typecheck` | "pass" \| "fail" \| "unknown" |
| `projectState.build.build` | "pass" \| "fail" \| "unknown" |
| `projectState.recent?.commits` | Length ≤ 5 |
| `projectState.recent?.sessions` | Length ≤ 3 |

---

## Dashboard Cross-Validation

### Mission Control ↔ Project Brain

**Requirement**: Mission Control (CurrentMilestone widget) and Project Brain (ProjectBrain widget) MUST display the same current milestone.

| Widget | Data Source | Field |
|--------|-------------|-------|
| CurrentMilestone | `projectState.milestone.currentMilestone` | M11 |
| CurrentMilestone | `projectState.milestone.currentMilestoneName` | Command Palette UI |
| ProjectBrain | `projectState.brain.currentFocus.milestone` | M11e — Command Palette UI (Ctrl+P) |

**Verification**: The numeric milestone root in CurrentMilestone (e.g., "M11") should be a prefix of the Brain's currentFocus.milestone (e.g., "M11e — Command Palette UI (Ctrl+P)"). They MUST refer to the same logical milestone.

### Manual Test

1. Open Dashboard in AI Studio
2. Observe CurrentMilestone widget → note the milestone (e.g., "M11 · Command Palette UI")
3. Observe ProjectBrain widget → note the current focus milestone
4. **Assert**: Both refer to the same milestone. Brain may show a more specific task ID (e.g., "M11e") while Mission Control shows the group ("M11"), but both belong to the same milestone family.

### ValidationProvider Checks (dev mode only)

The `ValidationProvider` independently verifies:

1. `workingTree.isClean` vs `git status --short`
2. `workingTree.modified` count vs git status
3. `workingTree.untracked` count vs git status
4. `milestone.branch` vs `git rev-parse --abbrev-ref HEAD`
5. `milestone.headCommit` vs `git rev-parse --short HEAD`
6. `milestone.baseline.tag` vs `git describe --tags --abbrev=0`
7. `milestone.baseline.commitsSince` vs `git rev-list --count`
8. `recent.commits.length` vs `git log --oneline -5`
9. `milestone.phase` vs regex extraction from TODO.md
10. `milestone.currentMilestone` exists in TODO.md
11. `nextActions` source validity
12. `nextActions` TODO-sourced actions match TODO.md content

---

## Changed Files

| File | Change |
|------|--------|
| `src/main/dashboard/BrainFocusSync.ts` | Rewrite: CRLF, structured ID, always-write sync |
| `src/main/dashboard/TodoProvider.ts` | Rewrite: CRLF, structured ID, dynamic task regex |
| `src/main/dashboard/BrainProvider.ts` | Simplify: sync writes file, provider reads it |
| `src/main/dashboard/types.ts` | Add `ProjectState` interface |
| `src/main/dashboard/DashboardService.ts` | Add `getProjectState()`, keep `getData()` for compat |
| `src/main/runtime/commands/handlers/DashboardHandler.ts` | Return `{ projectState }` |
| `src/renderer/env.d.ts` | Add `ProjectState` global interface |
| `src/renderer/stores/dashboard.ts` | Replace separate fields with `projectState` |
| `src/renderer/components/Dashboard.tsx` | Pass `projectState` to children |
| `src/renderer/components/ProjectBrain.tsx` | Read from `projectState.brain` |
| `src/renderer/components/CurrentMilestone.tsx` | Prop type: `ProjectState` |
| `src/renderer/components/IsHealthy.tsx` | Prop type: `ProjectState` |
| `src/renderer/components/TodaysRecommendation.tsx` | Prop type: `ProjectState` |
| `src/renderer/components/WorkspaceWidget.tsx` | Prop type: `ProjectState` |
| `src/renderer/components/RecentActivity.tsx` | Prop type: `ProjectState` |
| `docs/dashboard-data-validation.md` | New: validation document |
