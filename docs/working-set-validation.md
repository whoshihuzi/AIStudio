# Working Set Validation

> M13 Stabilization — Task 1
> Date: 2026-07-01
> Status: Complete

## Problem

One Working Tree always became one Working Set. Too coarse.

## Solution

`WorkingSetEngine.deriveWorkingSets()` groups changed files by milestone using deterministic
path-pattern matching (`FileClassifier.classifyByMilestone()`).

## Algorithm

```
Input: ChangedFile[]

For each file:
  1. Determine milestone via path patterns (FileClassifier.classifyByMilestone)
  2. If no milestone matched → assign to "—" (unassigned)

Group files by milestone ID

For each group:
  1. Build synthetic DevelopmentMilestone (id, name, phase=0, no tasks)
  2. Classify each file (core/support/incidental/unknown via FileClassifier)
  3. Detect test/doc companions
  4. Derive phase from classification ratios
  5. Compute commit readiness

Sort:
  - Active milestones first
  - Then by member count (most active first)
  - Unassigned ("—") always last

Output: WorkingSet[]
```

## Rules

- Files belonging to different milestones are never merged
- If only one milestone exists, behavior is identical to `deriveWorkingSet()` (single WorkingSet)
- No AI inference — pure deterministic path-pattern matching
- Zero I/O — pure function
- Backward compatible: `DevelopmentState.workingSet` retained as primary

## Verification

| Check | Result |
|-------|--------|
| Single milestone → 1 WorkingSet | PASS |
| Multiple milestones → N WorkingSets | PASS |
| Zero files → [] | PASS |
| Unmatched files → "—" working set | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
