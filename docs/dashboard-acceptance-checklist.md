# Dashboard Acceptance Checklist

This document defines the acceptance criteria for every Dashboard iteration. All criteria must pass before a Dashboard-related Milestone is considered Done.

---

## Mission Control Information Architecture (M12.6)

The Dashboard is AI Studio's Mission Control — a single-page overview that answers four questions through four sections:

| Section | Question | Provider |
|---------|----------|----------|
| **Project** | What are we building right now? | TodoProvider (+ GitProvider for branch/HEAD/baseline) |
| **Workspace** | How large is the codebase? | WorkspaceIndexStore (via DashboardHandler) |
| **Health** | Is the project in good shape? | GitProvider + BuildProvider |
| **Recommendation** | What should I do next? | GitProvider (dirty check) + TodoProvider (milestone) |

---

## Core Sections (MUST pass every iteration)

### Section 1: Project (Current Milestone)

- [ ] Current Phase displayed (e.g., "Phase 3 — Workspace Intelligence")
- [ ] Current Milestone ID and name visible without scrolling (e.g., "M11 — Command System Architecture Freeze")
- [ ] Milestone progress bar shows completed/total tasks in current milestone group
- [ ] Task pills indicate completed (✓), pending (●) with distinct colors
- [ ] Current branch and HEAD commit visible
- [ ] Stable Baseline tag, commit hash, and commits-since shown
- [ ] Last commit time shown (relative: "3 minutes ago", "2 hours ago")
- [ ] All values come from real data (TODO.md + Git), never hardcoded
- [ ] Project Brain auto-syncs currentFocus from TODO.md (via BrainFocusSync)

### Section 2: Workspace

- [ ] Indexed files count visible
- [ ] Indexed directories count visible
- [ ] Last index time visible
- [ ] All values from WorkspaceIndexStore (no disk scanning)
- [ ] Graceful fallback when index not yet built

### Section 3: Health

- [ ] Working tree status: Clean / Dirty with separate Modified and Untracked counts
- [ ] No file list — just counts
- [ ] Typecheck result: pass/fail, never shows stale "Not run" after checks complete
- [ ] Build result: pass/fail, never shows stale "Not run" after checks complete
- [ ] Before checks are run: a prompt to "Run now"
- [ ] Rerun button available after first run
- [ ] All values come from real data (GitProvider + BuildProvider)

### Section 4: Recommendation (Today's Recommendation)

Priority-based:
1. Working tree dirty → "Commit or stash your current work before continuing."
2. Active milestone with pending tasks → "Continue: MXX — Name"
3. Clean + complete → "Project is ready for the next milestone."
- [ ] No AI inference, pure rule-based logic
- [ ] All data from existing providers (GitProvider + TodoProvider)

---

## Supporting Context

- [ ] Recent commits and sessions collapsible (click to expand)
- [ ] Collapsed state shows count summary ("N commits, M sessions")
- [ ] Project Brain widget shows currentFocus auto-synced from TODO.md

---

## Data Integrity

- [ ] Every displayed number/text is traceable to a specific Provider
- [ ] No mock data, no UI-local state substituting for real data
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Error state: Dashboard shows meaningful error + retry button when data fails
- [ ] Loading state: Dashboard shows loading indicator on first load

---

## Navigation

- [ ] App starts on Dashboard by default
- [ ] Sidebar "Dashboard" item always visible, switches to Dashboard
- [ ] Clicking a Session in Sidebar switches to Chat and loads that session
- [ ] Switching between Dashboard and Chat preserves chat state
- [ ] Dashboard auto-refreshes on mount

---

## Visual Hierarchy

- [ ] Four core sections dominate the page: Project | Workspace | Health | Recommendation
- [ ] Each section has equal visual weight
- [ ] Section headings use muted uppercase styling (gray-500, tracking-wider)
- [ ] Recent activity uses reduced opacity (bg-gray-850/50, border-gray-700/30)
- [ ] Content max-width constrained (max-w-3xl) for readability

---

## Provider Architecture

- [ ] DashboardService is the single public entry point (Main process)
- [ ] GitProvider, TodoProvider, SessionProvider, BuildProvider, BrainProvider are independent classes
- [ ] BrainFocusSync parses TODO.md for currentFocus (no manual maintenance)
- [ ] WorkspaceIndexStore feeds Workspace widget via DashboardHandler
- [ ] Renderer calls only `dashboard.refresh` Command (IPC)
- [ ] Renderer never imports Provider classes
- [ ] ValidationProvider runs independently in dev mode (never exposed to Renderer)

---

## Data Validation (M6c.6)

- [ ] Working Tree (isClean, modified, untracked) verified against `git status --short`
- [ ] Branch verified against `git rev-parse --abbrev-ref HEAD`
- [ ] HEAD verified against `git rev-parse --short HEAD`
- [ ] Baseline tag verified against `git describe --tags --abbrev=0`
- [ ] Commits since baseline verified against `git rev-list --count TAG..HEAD`
- [ ] Recent commit count + first commit hash verified against `git log --oneline -5`
- [ ] Phase extracted from TODO.md matches
- [ ] Current milestone exists in TODO.md
- [ ] Next Actions source field is validated (only "TODO.md", "git", "docs")
- [ ] Validation failures logged as warnings, never block the Dashboard
- [ ] healthScore field reserved on ValidationReport (not computed yet)

---

## Release Gates (per iteration)

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — all entries build
- [ ] Manual: launch `npm run dev`, verify Dashboard renders with real data
- [ ] Manual: dirty-tree → commit → refresh → confirm health status updates
- [ ] Manual: run checks → confirm typecheck/build results appear
- [ ] `docs/dashboard-acceptance-checklist.md` updated if criteria changed
