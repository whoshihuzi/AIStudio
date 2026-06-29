# 04 — Roadmap

**The long-term roadmap with concrete milestones, progress tracking, and decision criteria for prioritization.**

---

## Current Status

| Field | Value |
|---|---|
| Current Phase | Phase 1 — Foundation |
| Current Sprint | Sprint 6 (next: Diff / Accept / Reject) |
| Stable Baseline | v0.2.0 (`a6d69c4`) |
| Previous Baseline | v0.1.0 |
| Next Major Version | v0.3.0 |

---

## Phase Overview

### Phase 1 — Foundation (IN PROGRESS)

**Goal**: Replace PowerShell for daily Hermes usage.

| Sprint | Name | Status |
|---|---|---|
| S1 | Project Initialization | ✓ Complete |
| S2 | Application Shell | ✓ Complete |
| S3 | Hermes Integration | ✓ Complete |
| S4 | Workspace (File tree, folder selection) | ◌ Pending |
| S5 | Conversation (Session, History, Save/Restore) | ✓ Complete |
| S6 | Diff (Accept, Reject, Preview) | ◌ Pending |

**v0.2.0** sits between S5 and S6: it adds the Project Awareness Dashboard as a navigational and decision-making layer before continuing with the remaining Phase 1 Sprints.

### Phase 2 — Projects (PLANNED)

**Goal**: Manage multiple projects within AIStudio.

Features: Project Manager, History, Checkpoints, Project Configuration

### Phase 3 — Multi-Agent (PLANNED)

**Goal**: Support multiple AI agents interchangeably.

Features: Agent Interface, Agent Manager, Model Switching, Shared Context

### Phase 4 — Workflow (PLANNED)

**Goal**: AI manages development tasks with human approval gates.

Features: Task Graph, Pipeline, Approval, Automation, Workflow Builder

### Phase 5 — Self Development (PLANNED)

**Goal**: AIStudio contributes to its own development.

Features: Architecture Analysis, Automatic Planning, Code Modification, Testing, Continuous Evolution

---

## Completed Milestones

| Milestone | Date | Commit | Description |
|---|---|---|---|
| M1 | 2026-06-27 | `d88c430` | Project skeleton, governance, TypeScript configs |
| M2 | 2026-06-27 | `9714700` | Electron bare application launch |
| M3 | 2026-06-27 | `b02e33e` | React + Vite + Tailwind + Chat shell + Runtime architecture |
| M4 | 2026-06-27 | `7b0c966` | ProcessAgentRuntime + Hermes adapter + Session persistence |
| M5 | 2026-06-27 | `f05cccf` | Conversation Rendering Engine (6 MessagePart types) |
| M6 | 2026-06-27 | `f43dc97` | Project Awareness Dashboard (3-question layout, i18n, Workspace Identity) |
| M7 | 2026-06-27 | `a787c4a` | Project Brain v1 (Knowledge Layer: 4 brain files, BrainProvider) |
| M8 | 2026-06-27 | `1807bb6` | Context Injection (ContextBuilder pipeline, Runtime-Agnostic) |
| — | — | `a6d69c4` | **v0.2.0 Stable Baseline** (M8d Release Freeze) |

---

## Upcoming Milestones (v0.3 — Phase 3: Workspace Intelligence)

### M9 — Workspace Foundation

Establish WorkspaceProvider + IPC layer. No UI.

**Why this next**: All workspace features (explorer, search, diff) depend on a stable filesystem provider.

### M10 — Workspace Explorer

File tree widget in Dashboard. Read-only browsing.

**Why this next**: First visible workspace feature. Users can browse project files.

### M11 — Search & Index

Full-text search across workspace. SearchBar widget.

**Why this next**: AI agents need to find relevant files before making changes.

### M12 — Code Manipulation Foundation

Write operations + audit trail. Foundation for Diff.

**Why this next**: Last v0.3 milestone. Enables agents to modify code through AIStudio.

---

## Prioritization Decision Criteria

When choosing what to build next, evaluate against these criteria:

1. **Product visibility**: Does this milestone make the product visibly more useful?
2. **Architectural necessity**: Is this required before other features can be built?
3. **Risk reduction**: Does this eliminate a known source of bugs or instability?
4. **Phase completion**: Does this unblock the Phase 1 "Replace PowerShell" goal?
5. **Technical debt**: Does this address a documented tech debt item?

Features that score high on multiple criteria should be prioritized.

---

## Decision Log

Significant decisions are recorded as Architecture Decision Records (ADRs) in `decisions/`. This log provides a summary index.

| Date | Decision | ADR | Rationale |
|---|---|---|---|
| 2026-06-27 | v0.2.0 = Dashboard, not Sprint 4 | (pending) | Dashboard makes AIStudio a "project cockpit" before adding more features. It's the navigational layer Phase 2 needs. |
| 2026-06-27 | Session persistence fix before Dashboard | (pending) | Production stability takes priority over new features. |
| 2026-06-27 | AKB created before v0.2.0 development | (pending) | Every future AI agent needs a consistent bootstrap. |
| 2026-06-27 | Electron as desktop framework | `decisions/001_electron-as-desktop-framework.md` | Mature ecosystem, excellent Windows support, VS Code-proven viability. |
| 2026-06-27 | Token usage data source analysis | `decisions/002_token-usage-data-source.md` | Recommended approach: read Hermes session DB. Deferred to later milestone. |
