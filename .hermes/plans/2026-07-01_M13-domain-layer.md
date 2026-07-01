# M13 Domain Layer Implementation Plan

> **For Hermes:** Implement directly — single file creation, single directory.

**Goal:** Implement all Development Intelligence domain types in `src/shared/development/types.ts` as the frozen foundation of the subsystem.

**Architecture:** Pure TypeScript types file — zero runtime code, zero Electron/Node/React imports, zero dependencies. Sits in `src/shared/` following the Shared Resource Model pattern (same pattern as `src/shared/editor/types.ts` and `src/shared/command/types.ts`).

**Tech Stack:** TypeScript only (no npm deps needed)

---

### Task 1: Create `src/shared/development/types.ts` — Complete Domain Types

**Objective:** All 15 frozen interfaces and 5 union types from architecture Section 3, plus pure utility helpers.

**Files:**
- Create: `src/shared/development/types.ts`

**Step 1: Write the complete types file**

Complete types from the frozen architecture (Section 3 of 16_DEVELOPMENT_INTELLIGENCE.md):

```
Interfaces (15):
  DevelopmentState        — top-level aggregate
  DevelopmentMilestone    — milestone identity
  DevelopmentSprint       — sprint identity
  WorkingSet              — file grouping by milestone
  WorkingSetMember        — one file in a WorkingSet
  ChangedFile             — tracked file from Git
  RelatedDocument         — source-doc relationship
  SuggestedCommitScope    — commit grouping intelligence
  CommitGroup             — atomic commit unit
  DevelopmentWarning      — development warning
  CompletionEstimate      — 0-100% estimate
  UncommittedRisk         — risk in uncommitted state

Union Types (5):
  FileClassification      = "core" | "support" | "incidental" | "unknown"
  FileChangeType          = "modified" | "added" | "deleted" | "renamed" | "untracked"
  WorkingSetPhase         = "forming" | "active" | "stabilizing" | "review" | "committed" | "abandoned"
  DocRelationship         = "architecture" | "changelog" | "todo" | "brain" | "principle" | "roadmap"
  WarningCategory         = "contamination" | "forgotten-files" | "missing-docs" | "missing-tests" | "orphan-changes" | "large-change" | "stale-branch"
```

**Pure utility helpers to include:**
- `createWorkingSetId(milestoneId: string): string` — derives WorkingSet ID from milestone ID

**Step 2: Verify typecheck**
Run: `npm run typecheck`
Expected: PASS — zero errors.

**Step 3: Verify build**
Run: `npm run build`
Expected: PASS — project buildable.

---

### Task 2: Update Documentation

**Files:**
- Modify: `docs/10_CHANGELOG.md`
- Modify: `logs/development.md`

**Step 1: Add M13 entry to CHANGELOG**
Add entry under v0.3.0 for M13 Domain Layer.

**Step 2: Update development log**
Record that M13 Construction Step 1 (Domain Layer) is complete.

---

### Verification

- `npm run typecheck` → zero errors
- `npm run build` → successful
- No new npm dependencies
- No circular imports
- No Electron/Node/React imports in `src/shared/development/types.ts`
- All types are pure data (interfaces + type aliases only)
