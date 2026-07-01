# Dashboard Information Architecture

> M12.7 — Architecture correction separating Current Task from Milestone Progress.
> Frozen: 2026-06-30

## Responsibility Matrix

Every Dashboard section answers exactly one question.

| Section | Question | Source | Shows |
|---|---|---|---|
| **Current Task** | What am I building right now? | `projectState.currentTask` (pre-computed by DashboardService) | Task ID, title, sprint, phase — first unchecked TODO.md item |
| **Milestone Progress** | How far through this milestone am I? | `projectState.milestone` (TodoProvider) | Phase label, milestone ID/name, progress bar, task badges, git info |
| **Workspace** | What resources are available? | `projectState.workspaceIndex` (WorkspaceIndexStore) | Indexed file/directory counts, last index time |
| **Health** | Is the project healthy? | `projectState.status` + `build` | Working tree status, typecheck/build results |
| **Recommendation** | What should I do next? | `projectState.status.recommendationType` | Priority-ordered guidance: dirty tree → commit/stash, active milestone → continue, clean → next milestone |
| **Project Brain** | Why am I doing this? | `projectState.brain` (BrainProvider, 4 files) | Current focus goal, sprint context, project metadata (phase, version, decisions, layers) |
| **Recent Activity** | What happened recently? | `projectState.recent` | Recent commits + sessions |

## Data Flow

```
TODO.md ──→ TodoParser (pure) ──→ TodoProvider (I/O) ──→ DashboardService.computeCurrentTask()
                                                       ──→ DashboardService.computeStatus()
workspace/brain/*.json ──→ BrainProvider ──→ DashboardService.getProjectState()
                                             ↓
                                        ProjectState (single object)
                                             ↓ IPC
                                        DashboardStore.projectState
                                             ↓ React
                    ┌──────────────────────┼──────────────────────┐
               CurrentTask       MilestoneProgress       ProjectBrain
```

## Boundaries

- **CurrentTask** owns: first unchecked task ID + title + sprint + phase
- **MilestoneProgress** owns: milestone progress bar, task checklist, git context
- **ProjectBrain** owns: sprint goal, architecture context, decisions — NEVER repeats task ID/title
- **Recommendation** owns: action guidance — NEVER restates task ID/title
- No widget derives data from raw fields; all data is pre-computed by DashboardService

## Anti-Patterns (Rejected)

- ProjectBrain showing "M11e — Command Palette UI (Ctrl+P)" — duplicates CurrentTask
- Recommendation showing "Continue: M11 — Command Palette UI (Ctrl+P)" — duplicates CurrentTask
- CurrentTask showing progress bar — belongs to MilestoneProgress
- Widgets deriving status from multiple fields instead of reading pre-computed status
