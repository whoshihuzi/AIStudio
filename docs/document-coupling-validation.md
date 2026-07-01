# Document Coupling Validation

> M13 Stabilization — Task 2
> Date: 2026-07-01
> Status: Complete

## Problem

Path → Documentation mapping was too mechanical. Renderer component changes alone
unnecessarily triggered architecture documentation requirements.

## Solution

`DocCouplingEngine` rules now distinguish four categories with explicit reasons.

## Coupling Categories

| Category | Trigger | Example |
|----------|---------|---------|
| **architecture** | `src/main/`, `src/shared/`, `architecture/` changes | `src/main/dashboard/` → `architecture/06_COLLABORATION.md` |
| **implementation-docs** | Renderer component changes | `src/renderer/components/editor/` → `docs/08_UI_GUIDELINES.md` |
| **changelog** | Any source change | `src/main/` or `src/renderer/` → `docs/10_CHANGELOG.md` |
| **logs** | Renderer changes | `src/renderer/` → `logs/development.md` |

## Rules

### Architecture docs are only required when architectural modules changed

Architectural modules: `src/main/`, `src/shared/`, `architecture/`

```typescript
// Guard: skip architectural-only rules when no architectural modules changed
if (rule.architecturalOnly && !hasArchitecturalChange) continue;
```

### Renderer changes map to implementation docs, not architecture

| Path | Coupling | Category |
|------|----------|----------|
| `src/renderer/components/editor/` | `docs/08_UI_GUIDELINES.md` | implementation-docs |
| `src/renderer/components/workspace/` | `docs/08_UI_GUIDELINES.md` | implementation-docs |
| `src/renderer/components/ui/` | `docs/08_UI_GUIDELINES.md` | implementation-docs |
| `src/renderer/` | `logs/development.md` | logs |
| `src/renderer/` | `docs/10_CHANGELOG.md` | changelog |

### Each coupling rule carries explicit reason

```typescript
interface DocCouplingRule {
  sourcePattern: string;
  docPath: string;
  relationship: DocRelationship;
  reason: string;           // ← explicit coupling reason
  architecturalOnly?: boolean;
}
```

## New DocRelationship values

- `implementation-docs` — Implementation-level documentation (not architecture)
- `logs` — Development log should be updated

## Verification

| Check | Result |
|-------|--------|
| Renderer-only changes do NOT trigger architecture docs | PASS |
| `src/main/` changes trigger architecture docs | PASS |
| `src/shared/` changes trigger architecture docs | PASS |
| `architecture/` changes trigger architecture + brain | PASS |
| All rules have explicit `reason` | PASS |
| `architecturalOnly` guard works | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
