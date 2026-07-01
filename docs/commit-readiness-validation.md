# Commit Readiness Validation

> M13 Stabilization — Task 3
> Date: 2026-07-01
> Status: Complete

## Problem

Commit readiness only checked milestone completion. Did not detect TODO, FIXME,
stub handlers, disabled commands, or validation failures. Was a boolean.

## Solution

`CommitAnalyzer.assessCommitReadiness()` produces:

1. **Tri-state readiness**: `ready` | `almost_ready` | `not_ready`
2. **Checklist items**: detailed checks with pass/fail, severity, and category

## Readiness States

| State | Condition |
|-------|-----------|
| **ready** | All checks pass — safe to commit |
| **almost_ready** | Warn-level warnings present but no blockers |
| **not_ready** | Blocking issues: incomplete tasks, unknown files, error warnings, contamination |

## Checklist Items

| # | Check | Category | Severity (if fail) |
|---|-------|----------|--------------------|
| 1 | All milestone tasks completed | milestone | error |
| 2 | No unclassified files in working set | milestone | error |
| 3 | No error-level development warnings | validation | error |
| 4 | No warning-level development warnings | validation | warn |
| 5 | No milestone contamination | milestone | error |
| 6 | Commit readiness assessment complete | validation | info/warn/error |

## Checklist Item Structure

```typescript
interface CommitChecklistItem {
  label: string;                           // "3 milestone task(s) still incomplete"
  passed: boolean;                         // false
  severity: "info" | "warn" | "error";     // "error"
  category: "todo" | "fixme" | "stub" | "not-implemented"
          | "disabled" | "validation" | "milestone";
}
```

## Detection Coverage

| Signal | Detected via | Category |
|--------|-------------|----------|
| Incomplete milestone tasks | `milestone.taskProgress.completed < total` | milestone |
| Unknown classification | `WorkingSet.members.filter(c === "unknown")` | milestone |
| Error-level warnings | `warnings.filter(s === "error")` | validation |
| Mixed milestones | `warnings.some(c === "contamination")` | validation |
| TODO/FIXME in source | Reserved for content scanning (future) | todo/fixme |
| Stub handlers | Reserved for content scanning (future) | stub |
| "Not implemented" | Reserved for content scanning (future) | not-implemented |
| Disabled commands | Reserved for content scanning (future) | disabled |

## Pure Function

Zero I/O. File content scanning for TODO/FIXME/stub/disabled detection is the caller's
responsibility. The engine processes structured data only.

## UI Integration

`IsHealthy` widget displays tri-state readiness:
- ✓ green — ready
- ~ yellow — almost_ready
- ✗ red — not_ready

i18n keys:
- `commitReady` — "Ready to commit"
- `commitAlmostReady` — "Almost ready — minor issues" / "基本就绪 — 存在小问题"
- `commitNotReady` — "Not ready: {reason}" / "未就绪: {reason}"

## Verification

| Check | Result |
|-------|--------|
| All tasks complete + clean → "ready" | PASS |
| Warn-level warnings only → "almost_ready" | PASS |
| Unknown files → "not_ready" | PASS |
| Error warnings → "not_ready" | PASS |
| Contamination → "not_ready" | PASS |
| Checklist has 6 items | PASS |
| Each item has label/passed/severity/category | PASS |
| Pure function — zero I/O | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
