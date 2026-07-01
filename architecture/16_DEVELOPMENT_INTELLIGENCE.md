# 16 — Development Intelligence Architecture

**Frozen Development Intelligence architecture for AI Studio. Implemented in v0.3.0 (M13). Architecture validated against all 18 design principles. Implementation verified via `npm run typecheck && npm run build`.**

---

## 1. Motivation

### Why Git Status Is Not Enough

AI Studio currently knows *what changed on disk* via `GitProvider.getWorkingTree()`. It returns a raw list of modified and untracked files. This is correct but incomplete.

An AI-native IDE needs to answer *development* questions, not just version-control questions:

| Git Status Answers | Development Intelligence Answers |
|---|---|
| Which files are modified? | What am I working on? |
| Are there any untracked files? | Which files belong to this milestone? |
| Is the index clean? | Is this working set ready to commit? |
| — | What documentation should change together? |
| — | What should be committed together? |
| — | Are there files I've forgotten? |
| — | Does this commit mix multiple milestones? |

Git status answers **what changed**. Development Intelligence answers **why it changed** and **what should happen next**.

### The Developer's Questions

When a developer (human or AI agent) opens AI Studio, they need to understand their development state at a glance:

1. **"What am I working on?"** — The current milestone, sprint, and task from the Project Brain.
2. **"Which files belong to this milestone?"** — The Working Set: all changed files that relate to the current development objective.
3. **"Is this ready to commit?"** — Whether the Working Set is coherent, complete, and free of unrelated changes.
4. **"What documentation should change together?"** — Docs that are coupled to the changed source files and may need updates.
5. **"What should be committed together?"** — Files that belong in a single atomic commit, not split across multiple commits.

These questions are the foundation of **Development State Awareness** — the ability of AI Studio to understand the *intent* behind changes, not just the *fact* of changes.

---

## 2. Architecture

### New Layer: DevelopmentIntelligenceService

```
┌──────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         DevelopmentIntelligenceService                │    │
│  │                                                      │    │
│  │  Responsibilities:                                   │    │
│  │                                                      │    │
│  │  1. Compose DevelopmentState from existing providers  │    │
│  │  2. Derive Working Set from changed files + milestone │    │
│  │  3. Compute commit readiness from Working Set         │    │
│  │  4. Identify related documents that should change     │    │
│  │  5. Detect cross-milestone contamination in changes   │    │
│  │  6. Produce warnings and recommendations              │    │
│  │  7. Estimate completion of current milestone          │    │
│  │                                                      │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                    │
│              ┌──────────┼──────────┐                         │
│              ▼          ▼          ▼                         │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│     │   Git    │ │   Todo   │ │  Brain   │                   │
│     │ Provider │ │ Provider │ │ Provider │                   │
│     └──────────┘ └──────────┘ └──────────┘                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Responsibilities Only

The `DevelopmentIntelligenceService` is a **pure composition layer**. It does not own any data source. It does not read files. It does not execute Git commands. It composes intelligence from providers that already exist.

| Responsibility | Description |
|---|---|
| **Compose DevelopmentState** | Aggregates Git changes, milestone progress, Brain data, and Working Set into a single coherent snapshot |
| **Derive Working Set** | Groups changed files by development objective; distinguishes milestone files from stray modifications |
| **Compute Commit Readiness** | Evaluates whether the current Working Set forms a valid, atomic, and complete commit |
| **Identify Related Documents** | Maps changed source files to their corresponding documentation files using project conventions |
| **Detect Contamination** | Flags when changed files span multiple milestones or mix unrelated concerns |
| **Produce Warnings** | Surfaces risks: forgotten files, mixed milestones, missing documentation updates |
| **Estimate Completion** | Derives milestone completion percentage from task progress + file change coverage |

### What It Must NOT Own

DevelopmentIntelligenceService is a **composer**, not a **provider**. It must not:

- Read files from disk
- Execute Git commands (that is GitProvider's job)
- Parse TODO.md (that is TodoProvider's job)
- Read Brain files (that is BrainProvider's job)
- Access the file system directly
- Own any new storage or on-disk state

It receives data from existing providers and produces intelligence. It adds zero new infrastructure dependencies.

### Relationship to Existing Services

```
DashboardService ──composes──► DevelopmentIntelligenceService
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              GitProvider     TodoProvider     BrainProvider
```

`DashboardService` already composes `GitProvider`, `TodoProvider`, and `BrainProvider` into `ProjectState`. `DevelopmentIntelligenceService` extends this composition with *derived intelligence* that none of the existing providers can produce alone.

`DashboardService` may compose `DevelopmentIntelligenceService` in the same way it composes individual providers today. This is a future decision — not part of this architecture freeze.

---

## 3. Core Data Model

### DevelopmentState (Frozen Interface)

```typescript
// src/shared/development/types.ts — Development Intelligence Resource Model
// Shared between Main and Renderer. No Electron imports. No Node imports. Pure data types.

export interface DevelopmentState {
  /** Current milestone identity from TODO.md + Brain */
  milestone: DevelopmentMilestone;

  /** Current sprint identity */
  sprint: DevelopmentSprint;

  /** All changed files, classified by relationship to current work */
  workingSet: WorkingSet;

  /** All tracked files (modified + staged + untracked) */
  changedFiles: ChangedFile[];

  /** Documentation files that should be reviewed/updated alongside source changes */
  relatedDocuments: RelatedDocument[];

  /** Recommended commit scope: which files belong together in one commit */
  suggestedCommitScope: SuggestedCommitScope;

  /** Active warnings about the current development state */
  warnings: DevelopmentWarning[];

  /** Estimated completion of current milestone (0–100) */
  completionEstimate: CompletionEstimate;

  /** Risks present in the uncommitted working state */
  uncommittedRisks: UncommittedRisk[];
}

// ----------------------------------------------------------
// Milestone Identity
// ----------------------------------------------------------

export interface DevelopmentMilestone {
  /** e.g. "M12" */
  id: string;
  /** e.g. "Editor Foundation" */
  name: string;
  /** Current phase (e.g. 3) */
  phase: number;
  /** Number of completed tasks / total tasks */
  taskProgress: { completed: number; total: number };
  /** Whether this milestone is the current active one */
  isActive: boolean;
}

export interface DevelopmentSprint {
  /** e.g. 4 */
  number: number;
  /** e.g. "Command System + Search UI" */
  goal: string;
  /** Whether this sprint is the current active one */
  isActive: boolean;
}

// ----------------------------------------------------------
// Working Set
// ----------------------------------------------------------

export interface WorkingSet {
  /** Unique identifier for this working set (derived from milestone id) */
  id: string;
  /** The milestone this working set belongs to */
  milestoneId: string;
  /** Files that belong to this working set */
  members: WorkingSetMember[];
  /** Current lifecycle phase */
  phase: WorkingSetPhase;
  /** Whether the working set is ready to commit */
  isCommitReady: boolean;
  /** Reason if not commit-ready */
  commitBlockerReason: string | null;
  /** Timestamp when the working set was first detected */
  createdAt: number;
  /** Timestamp of the last change to any member file */
  lastModifiedAt: number;
}

export type WorkingSetPhase =
  | "forming"    // Files being added to set
  | "active"     // Set is being worked on
  | "stabilizing" // Most files done, polishing
  | "review"     // Ready for review
  | "committed"  // Set has been committed
  | "abandoned"; // Set was discarded

export interface WorkingSetMember {
  /** Path relative to workspace root */
  path: string;
  /** How this file relates to the milestone */
  classification: FileClassification;
  /** Whether the file has been modified, added, or deleted */
  changeType: FileChangeType;
  /** Whether this file has a corresponding test file that should also change */
  hasTestFile: boolean;
  /** Whether this file has a corresponding doc file that should also change */
  hasDocFile: boolean;
}

export type FileClassification =
  | "core"        // Directly implements the milestone objective
  | "support"     // Supporting change (type, utility, config)
  | "incidental"  // Changed but unrelated to current milestone
  | "unknown";    // Cannot yet classify

export type FileChangeType =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "untracked";

// ----------------------------------------------------------
// Changed Files
// ----------------------------------------------------------

export interface ChangedFile {
  /** Path relative to workspace root */
  path: string;
  /** Change type from Git */
  changeType: FileChangeType;
  /** Which milestone this file most likely belongs to (if known) */
  associatedMilestone: string | null;
  /** Which working set this file belongs to (if any) */
  workingSetId: string | null;
  /** Whether this file is staged */
  staged: boolean;
}

// ----------------------------------------------------------
// Related Documents
// ----------------------------------------------------------

export interface RelatedDocument {
  /** Path to the source file that triggered this doc relationship */
  sourcePath: string;
  /** Path to the related documentation file */
  docPath: string;
  /** The nature of the relationship */
  relationship: DocRelationship;
  /** Whether the doc file has been modified in the working tree */
  isModified: boolean;
}

export type DocRelationship =
  | "architecture"   // Source is referenced in an architecture doc
  | "changelog"      // Change should be recorded in changelog
  | "todo"           // Task status should be updated in TODO.md
  | "brain"          // Brain data should be refreshed
  | "principle"      // Change may affect documented design principles
  | "roadmap";       // Change affects the roadmap

// ----------------------------------------------------------
// Commit Intelligence
// ----------------------------------------------------------

export interface SuggestedCommitScope {
  /** Recommended single-commit file groups */
  groups: CommitGroup[];
  /** Files that appear to belong to no milestone (orphan changes) */
  orphanFiles: string[];
  /** Files likely forgotten (should be in working set but aren't) */
  likelyForgotten: string[];
  /** Whether the changes mix multiple milestones (bad practice) */
  mixesMultipleMilestones: boolean;
}

export interface CommitGroup {
  /** Suggested commit message */
  suggestedMessage: string;
  /** Files in this group */
  files: string[];
  /** Which milestone this group relates to */
  milestoneId: string;
  /** Conventional commit type */
  commitType: "feat" | "fix" | "refactor" | "docs" | "test" | "chore";
}

// ----------------------------------------------------------
// Warnings
// ----------------------------------------------------------

export interface DevelopmentWarning {
  /** Warning severity */
  severity: "info" | "warn" | "error";
  /** Human-readable warning message */
  message: string;
  /** Which files are affected (empty if global) */
  affectedFiles: string[];
  /** Category for filtering/grouping */
  category: WarningCategory;
}

export type WarningCategory =
  | "contamination"     // Files from multiple milestones mixed
  | "forgotten-files"   // Expected file not in working set
  | "missing-docs"      // Documentation not updated alongside code
  | "missing-tests"     // Test files not updated alongside source
  | "orphan-changes"    // Changed files with no known milestone
  | "large-change"      // Working set is unusually large
  | "stale-branch";     // Branch is behind/ahead of remote

// ----------------------------------------------------------
// Completion Estimate
// ----------------------------------------------------------

export interface CompletionEstimate {
  /** Percentage complete (0–100) */
  percentage: number;
  /** Tasks complete / total in the current milestone */
  tasks: { completed: number; total: number };
  /** Files changed so far / total files expected to change */
  files: { changed: number; estimated: number };
  /** Human-readable label (e.g. "60% — 3 of 5 tasks, 8 files changed") */
  label: string;
}

// ----------------------------------------------------------
// Uncommitted Risks
// ----------------------------------------------------------

export interface UncommittedRisk {
  /** Risk description */
  description: string;
  /** Severity */
  severity: "low" | "medium" | "high";
  /** Mitigation recommendation */
  mitigation: string;
}
```

### Ownership

All types above belong to the **Domain layer** (`src/shared/development/types.ts`). They are pure data — no Electron, no Node.js, no React, no implementation. They follow Principle 17 (Shared Resource Model).

The `DevelopmentIntelligenceService` in the Infrastructure layer produces `DevelopmentState` instances. The Renderer receives them via the same IPC pattern as `ProjectState` today.

No existing types are modified. No existing providers are modified. This is a new capability that composes existing data into higher-level intelligence.

---

## 4. Working Set Concept

### Definition

A **Working Set** groups changed files that belong to one development objective — typically one milestone or one feature.

A Working Set is **not** a Git feature. It is not a branch. It is not a stash. It is not an index. It is a *semantic grouping* derived from Git state + Project Brain + file path conventions.

### Why Working Sets Matter

| Without Working Sets | With Working Sets |
|---|---|
| "15 files changed" | "M12 Working Set: 8 files (active)" |
| Are these all for the same feature? | Yes — all 8 classified as core or support |
| Should I commit now? | Blocked: 2 test files missing, changelog not updated |
| What belongs together? | Commit group: feat(editor): 5 files + docs: 3 files |

### Membership

A file enters a Working Set when:

1. It is changed (modified, added, or renamed) in the working tree
2. Its path matches a known pattern for the active milestone (derived from Brain, TODO.md, or file naming conventions)
3. OR it is explicitly classified by the developer or AI agent as belonging to the milestone

Membership rules:

- A file belongs to **at most one** Working Set at a time
- Files that match no known milestone are classified as `"incidental"` or `"unknown"`
- Files that match multiple milestones generate a `contamination` warning
- The Working Set is derived from Git state — it never modifies Git state

### Classification

How `DevelopmentIntelligenceService` classifies a changed file:

1. **Path convention**: Does the file path contain a milestone-related directory or prefix? (e.g. `src/main/runtime/commands/` → M11)
2. **Git history**: Do recent commits touching this file reference the current milestone in their messages?
3. **Brain metadata**: Does `workspace/brain/architecture.json` map this file to a known module, and is that module part of the current milestone?
4. **TODO.md task descriptions**: Do any active tasks mention this file or its directory?
5. **Fallback**: If no signals match, the file is classified as `"unknown"` — flagged for human or AI agent review.

### Lifecycle

```
forming ──► active ──► stabilizing ──► review ──► committed
   │                                                │
   └──────────────► abandoned ◄─────────────────────┘
```

| Phase | Trigger | Meaning |
|---|---|---|
| **forming** | First changed file detected for a new milestone | Files accumulating; too early to commit |
| **active** | Multiple core files changed; task progress > 25% | Active development; working set growing |
| **stabilizing** | Task progress > 75% and no new files added in last hour | Polishing; no new scope being added |
| **review** | All milestone tasks complete; working set stable | Ready for human or AI agent review |
| **committed** | All files committed to Git | Working set dissolved; milestone complete |
| **abandoned** | Working set inactive for N days; branch switched | Set discarded or superseded |

Phase transitions are *derived* — they are computed from Git state + task progress, never set manually. The phase is an interpretation of the data, not a user-controlled state.

### Completion

A Working Set is **complete** when:

1. All files in the set are modified and ready (no uncommitted drafts)
2. All milestone tasks that relate to these files are marked complete in TODO.md
3. All related documentation files are identified and either updated or explicitly deferred
4. No contamination warnings remain (no files from other milestones mixed in)

### Commit Readiness

A Working Set is **commit-ready** when:

| Condition | Source |
|---|---|
| All files classified as `"core"` or `"support"` | GitProvider working tree |
| No files classified as `"incidental"` or `"unknown"` | FileClassification |
| All related documents identified and modified or deferred | RelatedDocument list |
| No active warnings with severity `"error"` | DevelopmentWarning list |
| Milestone tasks for these files are complete | TodoProvider milestone data |

If not ready, `commitBlockerReason` contains the first blocking condition found, enabling the UI to display "Cannot commit: 2 files have unknown classification" rather than a generic error.

---

## 5. Commit Intelligence

### Future Capability Overview

Commit Intelligence is the ability of AI Studio to reason about *what should be committed together* based on development context, not just file proximity.

This is a **future capability** — part of this architecture freeze to ensure the data model supports it, but not part of the initial implementation scope.

### Files That Belong Together

Given the current set of changed files, AI Studio can determine:

1. **Atomic commit groups**: Files that implement a single logical change and should be committed together. For example:
   - `src/main/editor/EditorHandler.ts` + `src/shared/editor/types.ts` + `src/renderer/stores/editor.ts` — one feature across layers
   - These should be one commit, not three separate commits

2. **Commit ordering**: When multiple Working Sets are active, which should be committed first based on dependency analysis:
   - Shared types must be committed before the handlers that use them
   - Infrastructure changes before the features that depend on them

3. **Conventional commit type inference**: Based on file paths and change patterns:
   - `src/shared/` → `refactor` (type changes)
   - `docs/` → `docs`
   - `src/main/` → `feat` or `fix`
   - `tests/` → `test`

### Files Likely Forgotten

AI Studio can detect when a file *should* be in the Working Set but isn't:

1. **Missing test files**: `src/main/foo/Bar.ts` changed, but `tests/foo/Bar.test.ts` is not in the changed set
2. **Missing type files**: `EditorHandler.ts` changed, but `src/shared/editor/types.ts` is not in the changed set
3. **Missing config files**: New provider created, but no entry in the relevant index/registry file
4. **Missing documentation**: Source file changed, but its corresponding architecture doc or changelog entry is not in the changed set

Detection rules are based on project conventions (Principle 9: Naming Conventions) and can be extended per workspace.

### Documentation That Should Change Together

AI Studio maps source files to documentation files using the project conventions:

| Source Pattern | Documentation Pattern | Relationship |
|---|---|---|
| `src/main/dashboard/*` | `architecture/` | Architecture docs that describe this module |
| `src/shared/*/types.ts` | `architecture/` | Resource model docs |
| Any source change | `docs/10_CHANGELOG.md` | Changelog should record the change |
| Any milestone task completion | `docs/09_TODO.md` | Task checkbox should be updated |
| Architecture change | `workspace/brain/architecture.json` | Brain should reflect new architecture |
| New ADR or decision | `workspace/brain/decisions.json` | Brain should record the decision |

These mappings are derived from the project's existing conventions — they are not a new configuration system.

### Cross-Milestone Contamination

A commit mixes multiple milestones when:

1. Changed files belong to different Working Sets with different `milestoneId` values
2. Changed files have `associatedMilestone` values that don't match the current milestone
3. The commit message references multiple unrelated features

AI Studio flags this as a `contamination` warning with severity `"warn"` or `"error"` depending on the degree of mixing. A single stray file from another milestone is a warning; half the changed files from another milestone is an error.

### Scope of Commit Intelligence

| Capability | v0.3 (initial) | v0.4+ |
|---|---|---|
| File classification (core/support/incidental) | ✓ Inference from path + milestone | ✓ ML-enhanced classification |
| Commit grouping | Architecture supports it | Implementation |
| Forgotten file detection | Architecture supports it | Implementation |
| Documentation coupling | Architecture supports it | Implementation |
| Contamination detection | Architecture supports it | Implementation |
| Conventional commit suggestion | Architecture supports it | Implementation |
| Commit ordering (dependency analysis) | — | Architecture supports it |

---

## 6. Future Compatibility

The Development Intelligence architecture is designed to feed multiple subsystems without redesign.

### Dashboard

```
Dashboard (Presentation)
    │
    ▼
DashboardService.getProjectState()
    │
    ├──► GitProvider.getWorkingTree()        ← raw files
    ├──► TodoProvider.getMilestoneProgress() ← task status
    ├──► BrainProvider.getBrainData()        ← project context
    │
    └──► DevelopmentIntelligenceService.getDevelopmentState()
              │
              ├──► DevelopmentState.workingSet     → "M12 Working Set: 8 files (active)"
              ├──► DevelopmentState.warnings        → "2 test files missing"
              ├──► DevelopmentState.completionEstimate → "75% complete"
              └──► DevelopmentState.relatedDocuments → "CHANGELOG.md needs update"
```

The Dashboard's "Health" section can surface Development Intelligence warnings alongside build status. The "Recommendation" section can use commit readiness to suggest the next action.

### Command Palette (Ctrl+P)

```
Command Palette
    │
    │  Queries CommandRegistry + DevelopmentState
    │
    ▼
"Commit M12 Working Set"    ← command generated from DevelopmentState
"Show Forgotten Files"       ← command generated from DevelopmentState.warnings
"Update Related Docs"        ← command generated from DevelopmentState.relatedDocuments
```

Development Intelligence produces *dynamic* commands. When the Working Set is commit-ready, `"Commit M12 Working Set"` appears in the Command Palette. When contamination is detected, `"Separate Mixed Commits"` appears. These are not static registered commands — they are derived from the current development state.

### AI Agent

```
AI Agent (Hermes, Claude, etc.)
    │
    │  Reads DevelopmentState via tool call
    │
    ▼
"Your current working set for M12 has 8 files.
 2 test files are missing. CHANGELOG.md should be updated.
 The working set is 75% complete and stabilizing.
 Would you like me to generate the missing test files?"
```

AI agents receive `DevelopmentState` as structured context. They can reason about the project's development state without parsing Git output or TODO.md themselves. They can suggest next actions based on warnings and completion estimates.

### Release Preparation

```
Release Checklist
    │
    ▼
DevelopmentIntelligenceService
    │
    ├──► All Working Sets for this release: committed ✓
    ├──► Changelog updated: ✓
    ├──► Architecture docs updated: ✓
    ├──► Brain data refreshed: ✓
    └──► No contamination warnings: ✓
    │
    ▼
"Release v0.3.0 is ready. All 4 working sets committed.
 12 files changed across 3 modules. Changelog complete."
```

### Session Handoff

When a development session ends (developer closes AI Studio or AI agent finishes a task), Development Intelligence produces a handoff snapshot:

```
Session Handoff
    │
    ▼
DevelopmentIntelligenceService.getHandoffSnapshot()
    │
    ├──► activeWorkingSets: [M12 (8 files, 75% complete)]
    ├──► pendingWarnings: ["CHANGELOG.md not updated"]
    ├──► lastCompletedTask: "M12d: EditorHandler"
    └──► suggestedNextTask: "M12e: EditorPanel"
    │
    ▼
Next session starts → AI agent reads handoff → continues without re-discovery
```

---

## 7. Architecture Validation

The Development Intelligence architecture must not violate any existing Design Principle.

### Principle 1: Agent Agnosticism

| Check | Status |
|---|---|
| DevelopmentState contains no agent/adapter name | ✓ Pure data |
| DevelopmentIntelligenceService receives no agent-specific input | ✓ |
| AI agents consume DevelopmentState generically, same as any consumer | ✓ |
| No `"hermes"` string in any Development Intelligence type | ✓ |

**Verdict**: ✓ Compliant. Development Intelligence is an agent-agnostic capability.

### Principle 2: Layer Isolation

| Check | Status |
|---|---|
| DevelopmentState types in `src/shared/` (Domain) | ✓ |
| DevelopmentIntelligenceService in Infrastructure | ✓ |
| Service depends on existing providers (all Infrastructure) | ✓ |
| No upward dependency (providers never import the service) | ✓ |
| Renderer receives DevelopmentState via IPC, same pattern as ProjectState | ✓ |

**Verdict**: ✓ Compliant. Follows the four-layer dependency direction.

### Principle 3: Documentation Is Truth

| Check | Status |
|---|---|
| This document is the frozen architecture | ✓ |
| Implementation must follow this document | ✓ |
| Changes to DevelopmentState shape require updating this document | ✓ |

**Verdict**: ✓ Compliant. Architecture before implementation.

### Principle 4: Small, Reversible Changes

| Check | Status |
|---|---|
| Development Intelligence can be delivered in independent milestones | ✓ |
| Each capability (Working Set, Commit Intelligence, Warnings) is separable | ✓ |
| Composing existing providers — no new infrastructure dependency | ✓ |

**Verdict**: ✓ Compliant. Capabilities are incrementally deliverable.

### Principle 5: Pure Functions Over Side Effects

| Check | Status |
|---|---|
| DevelopmentIntelligenceService.computeState(input: ProviderData): DevelopmentState | ✓ Pure transformation |
| No file I/O, no process spawn, no mutation of provider state | ✓ |
| Existing providers handle all side effects | ✓ |

**Verdict**: ✓ Compliant. The service is a pure composition function.

### Principle 6: Explicit Over Implicit

| Check | Status |
|---|---|
| DevelopmentState fully typed, every field documented | ✓ |
| FileClassification has four explicit categories, no implicit defaults | ✓ |
| WorkingSetPhase is an explicit union type, no magic strings | ✓ |
| WarningCategory is a fixed set, not free-form | ✓ |

**Verdict**: ✓ Compliant. All types are explicit and documented.

### Principle 7: Composition Over Inheritance

| Check | Status |
|---|---|
| DevelopmentIntelligenceService composes GitProvider + TodoProvider + BrainProvider | ✓ Composition |
| No base class for "intelligence providers" | ✓ No unnecessary hierarchy |
| WorkingSet, CommitGroup, DevelopmentWarning are composed from provider data | ✓ |

**Verdict**: ✓ Compliant. Composition of existing providers, not inheritance.

### Principle 8: Fail Fast, Fail Loud

| Check | Status |
|---|---|
| If GitProvider fails, DevelopmentState reflects it via warnings, not silent fallback | ✓ Architecturally supported |
| Unknown file classification is explicit (`"unknown"`), not a null | ✓ |
| Commit blocker reason is always a string, not a nullable boolean | ✓ |

**Verdict**: ✓ Compliant. Error states are explicit in the data model.

### Principle 9: Naming Conventions

| Check | Status |
|---|---|
| Types file: `src/shared/development/types.ts` | ✓ kebab-case directory |
| Service: `DevelopmentIntelligenceService.ts` | ✓ PascalCase class |
| Interface: `DevelopmentState`, `WorkingSet`, `CommitGroup` | ✓ PascalCase types |
| File paths follow `domain/feature/` convention | ✓ |

**Verdict**: ✓ Compliant. All names follow established conventions.

### Principle 10: Configuration, Not Code

| Check | Status |
|---|---|
| File classification rules derived from project conventions, not hardcoded maps | ✓ |
| Documentation coupling is convention-based, not config-file-driven | ✓ |
| No new configuration file required | ✓ |

**Verdict**: ✓ Compliant. Intelligence is derived, not configured.

### Principle 11: Renderer No FS

| Check | Status |
|---|---|
| DevelopmentState produced in Main process | ✓ |
| Renderer receives via IPC, same as ProjectState | ✓ |
| DevelopmentState types in `src/shared/` have zero Node/Electron imports | ✓ |
| Renderer never calls Git or reads TODO.md | ✓ |

**Verdict**: ✓ Compliant. Renderer receives intelligence, never produces it.

### Principle 12: TypeScript Strict Mode

| Check | Status |
|---|---|
| All DevelopmentState fields have explicit types | ✓ |
| No `any` in any Development Intelligence type | ✓ |
| Union types used for finite sets (FileClassification, WorkingSetPhase, etc.) | ✓ |

**Verdict**: ✓ Compliant. All types are strict and complete.

### Principle 13: Tests for Domain Logic

| Check | Status |
|---|---|
| DevelopmentState is pure data — trivially testable | ✓ |
| DevelopmentIntelligenceService.computeState is a pure function — testable with mock provider data | ✓ |
| File classification logic is pure — testable with file path + milestone inputs | ✓ |
| Warning derivation rules are pure — testable with WorkingSet inputs | ✓ |

**Verdict**: ✓ Compliant. Domain logic is testable by design.

### Principle 14: Internationalization

| Check | Status |
|---|---|
| DevelopmentWarning.message is human-readable — should go through i18n | ✓ Future concern |
| CompletionEstimate.label is human-readable — should go through i18n | ✓ Future concern |
| All internal type fields are English, not user-facing | ✓ |

**Verdict**: ✓ Compliant. User-facing strings are identifiable for future i18n.

### Principle 15: Workspace Identity

| Check | Status |
|---|---|
| WorkingSet.milestoneId ties to workspace-specific milestone | ✓ |
| File paths are relative to workspace root | ✓ |
| DevelopmentState is workspace-scoped, not global | ✓ |

**Verdict**: ✓ Compliant. Intelligence is workspace-aware.

### Principle 16: Project Brain

| Check | Status |
|---|---|
| DevelopmentIntelligenceService reads Brain via BrainProvider (never directly) | ✓ |
| WorkingSet classification uses Brain architecture data | ✓ |
| Development Intelligence can flag when Brain data is stale | ✓ Future capability |
| No new Brain files required | ✓ |

**Verdict**: ✓ Compliant. Respects Brain as the single AI context source.

### Principle 17: Shared Resource Model

| Check | Status |
|---|---|
| DevelopmentState defined in `src/shared/development/types.ts` | ✓ |
| Zero Electron/Node/React imports in Development State types | ✓ |
| Main and Renderer share the same DevelopmentState definition | ✓ |
| No separate Renderer-specific development types | ✓ |

**Verdict**: ✓ Compliant. Development types follow the Shared Resource Model pattern.

### Principle 18: Interaction Through Commands

| Check | Status |
|---|---|
| Development Intelligence can produce dynamic commands for Command Palette | ✓ Future |
| `"commit.working-set"`, `"development.show-warnings"` are Commands | ✓ Future |
| No ad-hoc shortcuts bypassing CommandRegistry | ✓ |

**Verdict**: ✓ Compliant. All developer actions are command-compatible.

### Full Principle Compliance Matrix

| # | Principle | Compliance | Notes |
|---|---|---|---|
| 1 | Agent Agnostic | ✓ | No agent name in types or service |
| 2 | Layer Isolation | ✓ | Domain types → Infrastructure service → IPC → Renderer |
| 3 | Documentation is Truth | ✓ | This document is frozen architecture |
| 4 | Small Changes | ✓ | Capabilities are independently deliverable |
| 5 | Pure Functions | ✓ | Service is a pure composition |
| 6 | Explicit | ✓ | All types fully specified, no magic values |
| 7 | Composition | ✓ | Composes existing providers |
| 8 | Fail Fast | ✓ | Error states explicit: `"unknown"`, blocker reason |
| 9 | Naming | ✓ | Follows all conventions |
| 10 | Configuration | ✓ | Derived from conventions, not config files |
| 11 | Renderer No FS | ✓ | Main produces, Renderer receives via IPC |
| 12 | TypeScript Strict | ✓ | Fully typed, no `any` |
| 13 | Tests | ✓ | Domain logic is pure and testable |
| 14 | i18n | ✓ | User-facing strings identifiable |
| 15 | Workspace Identity | ✓ | Workspace-scoped via relative paths |
| 16 | Project Brain | ✓ | Reads Brain through BrainProvider |
| 17 | Shared Resource | ✓ | Types in `src/shared/` |
| 18 | Commands | ✓ | Intelligence feeds Command Palette |

**Verdict**: ✓ The Development Intelligence architecture violates zero design principles.

---

## 8. What Is Frozen vs Evolving

### FROZEN (cannot change without new architecture document or ADR)

```
  ✓ DevelopmentState type shape and field set
  ✓ WorkingSet concept: membership, lifecycle phases, classification types
  ✓ FileClassification union type (core | support | incidental | unknown)
  ✓ WorkingSetPhase lifecycle states and their meanings
  ✓ SuggestedCommitScope structure (groups, orphan files, likely forgotten, contamination)
  ✓ DevelopmentWarning category union type
  ✓ CompletionEstimate computation model (tasks + files)
  ✓ UncommittedRisk severity levels
  ✓ DevelopmentIntelligenceService as pure composer (no file I/O, no Git exec, no new storage)
  ✓ Service depends on existing providers only (GitProvider, TodoProvider, BrainProvider)
  ✓ Shared Resource Model location: src/shared/development/types.ts
  ✓ No new IPC channels — reuse existing Dashboard IPC pattern
  ✓ No new Provider — compose existing ones
```

### EVOLVING (can change per milestone)

```
  ○ File classification rules (which paths match which milestones)
  ○ Documentation coupling mapping (which docs relate to which source patterns)
  ○ WorkingSet phase transition timing thresholds
  ○ Commit readiness criteria weights and priorities
  ○ Warning severity thresholds (when contamination goes from warn to error)
  ○ CompletionEstimate.file.estimated: how the expected file count is determined
  ○ Suggested commit message formatting
  ○ Dynamic command generation for Command Palette
  ○ Integration with Session Handoff format
  ○ Whether DashboardService composes DevelopmentIntelligenceService directly or via proxy
```

---

## 9. Relationship to Existing Architecture Documents

| Document | Relationship |
|---|---|
| `15_EDITOR_ARCHITECTURE.md` | Editor is a WorkingSet consumer: open files from Working Set, save through EditorHandler |
| `03_DESIGN_PRINCIPLES.md` | All 18 principles validated; zero violations |
| `docs/04_ARCHITECTURE.md` | DevelopmentIntelligenceService sits in Infrastructure, serving Domain types |
| `docs/06_PRINCIPLES.md` | Rules 1–13 all satisfied by this architecture |

---

## 10. Implementation Status (v0.3.0)

```
M13: Development Intelligence                           ← ✓ complete
  Construction Step 1: Domain types (src/shared/development/types.ts)  ← ✓
  Construction Step 2: Pure analysis engines (8 engines)               ← ✓
  Construction Step 3: DevelopmentIntelligenceService (composition)    ← ✓
  Construction Step 4: DevelopmentState verification + Inspector       ← ✓
  Construction Step 5: Dashboard integration (3 widgets refactored)    ← ✓
  M13 Stabilization: WorkingSet milestone-awareness, tri-state commit  ← ✓
```

### Implemented

| Module | Location | Status |
|---|---|---|
| Domain types (15 interfaces, 7 union types) | `src/shared/development/types.ts` | ✓ |
| FileClassifier | `src/main/development/FileClassifier.ts` | ✓ (milestone-aware) |
| WorkingSetEngine | `src/main/development/WorkingSetEngine.ts` | ✓ (multi-WS) |
| DocCouplingEngine | `src/main/development/DocCouplingEngine.ts` | ✓ (18 rules with reasons) |
| WarningAnalyzer | `src/main/development/WarningAnalyzer.ts` | ✓ |
| CompletionAnalyzer | `src/main/development/CompletionAnalyzer.ts` | ✓ |
| CommitAnalyzer | `src/main/development/CommitAnalyzer.ts` | ✓ (tri-state + checklist) |
| RiskAnalyzer | `src/main/development/RiskAnalyzer.ts` | ✓ |
| ProjectActivity | `src/main/development/ProjectActivity.ts` | ✓ (pure projection) |
| DevIntelligenceService | `src/main/development/DevelopmentIntelligenceService.ts` | ✓ (pure composer) |
| DevStateInspector | `src/main/development/DevelopmentStateInspector.ts` | ✓ (dev util) |
| Dashboard integration | Dashboard widgets: IsHealthy, TodaysRecommendation, RecentActivity | ✓ |
| i18n | 21 Development Intelligence keys (en + zh-CN) | ✓ |

### Dashboard Integration

`DevelopmentState` is composed by `DashboardService.getProjectState()` and attached as `state.developmentState`. Three Dashboard widgets consume it:

| Widget | Consumption | Source |
|---|---|---|
| IsHealthy | completion %, warnings count, commit readiness, risks count | `devState` |
| TodaysRecommendation | `devState.workingSet.phase` → phase-based recommendation | `devState` (pre-computed) |
| RecentActivity | `devState.changedFiles`, `devState.relatedDocuments` | `devState` |

Dashboard is a pure presentation layer — zero business logic, zero derivation from raw fields.

### NOT in v0.3

- Commit ordering by dependency analysis (v0.4+)
- ML-enhanced file classification (v0.5+)
- Cross-workspace intelligence (v0.5+)
- Historical intelligence (trend analysis over time) (v0.5+)
