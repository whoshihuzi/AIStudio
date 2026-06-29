# Dashboard Acceptance Checklist

This document defines the acceptance criteria for every Dashboard iteration. All criteria must pass before a Dashboard-related Milestone is considered Done.

---

## Core Questions (MUST pass every iteration)

When a developer opens AIStudio after several days away, the Dashboard must answer these within seconds:

### Q1: Where am I?

- [ ] Current Phase and Sprint name visible without scrolling
- [ ] Progress bar shows completed/total Sprints
- [ ] Sprint pills indicate completed (✓), current (●), future (○) with distinct colors
- [ ] Current branch and HEAD commit visible
- [ ] Stable Baseline tag, commit hash, and commits-since shown
- [ ] All values come from real data (TODO.md + Git), never hardcoded

### Q2: Is the project healthy?

- [ ] Working tree status immediately visible (Clean / N modified, M untracked)
- [ ] When dirty: file names shown (up to 3, with "+N more")
- [ ] Typecheck result: pass/fail, never shows stale "Not run" after checks complete
- [ ] Build result: pass/fail, never shows stale "Not run" after checks complete
- [ ] Before checks are run: a clear prompt to "Run now" (not three "?" icons)
- [ ] Rerun button available after first run
- [ ] All values come from real data (GitProvider + BuildProvider)

### Q3: What should I do next?

- [ ] Uncommitted changes appear as the top-priority action when working tree is dirty
- [ ] Incomplete Sprint tasks from TODO.md shown with priority numbers
- [ ] Each action shows its source (TODO.md, git)
- [ ] Empty state: "All complete" when nothing is pending
- [ ] All values come from real data (GitProvider + TodoProvider)

---

## Supporting Context

- [ ] Recent commits and sessions are visually secondary (lower contrast, smaller text)
- [ ] Recent activity is collapsed by default (click to expand)
- [ ] Collapsed state shows count summary ("N commits, M sessions")

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

- [ ] Three core sections (WhereAmI, IsHealthy, WhatNext) dominate the page
- [ ] Each section has equal visual weight
- [ ] Section headings use muted uppercase styling (gray-500, tracking-wider)
- [ ] Recent activity uses reduced opacity (bg-gray-850/50, border-gray-700/30)
- [ ] Content max-width constrained (max-w-3xl) for readability

---

## Provider Architecture

- [ ] DashboardService is the single public entry point (Main process)
- [ ] GitProvider, TodoProvider, SessionProvider, BuildProvider are independent classes
- [ ] Renderer calls only `dashboard:get-data` and `dashboard:run-checks` IPC channels
- [ ] Renderer never imports Provider classes
- [ ] Adding a new Provider does not require Renderer changes
- [ ] ValidationProvider runs independently in dev mode (never exposed to Renderer)
- [ ] Every core field has a validation rule with pass/fail/warn status
- [ ] Console log shows validation summary on every `dashboard:get-data` call

---

## Data Validation (M6c.6)

- [ ] Working Tree (isClean, modified, untracked) verified against `git status --short`
- [ ] Branch verified against `git rev-parse --abbrev-ref HEAD`
- [ ] HEAD verified against `git rev-parse --short HEAD`
- [ ] Baseline tag verified against `git describe --tags --abbrev=0`
- [ ] Commits since baseline verified against `git rev-list --count TAG..HEAD`
- [ ] Recent commit count + first commit hash verified against `git log --oneline -5`
- [ ] Total Sprints count verified against `docs/09_TODO.md` Sprint headers
- [ ] Phase extracted from TODO.md matches
- [ ] Next Actions source field is validated (only "TODO.md", "git", "docs")
- [ ] TODO-sourced actions actually appear in `docs/09_TODO.md`
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
