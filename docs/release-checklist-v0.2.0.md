# v0.2.0 — Release Checklist

**Target**: v0.2.0 Stable Baseline
**Date**: 2026-06-27

---

## Build Gates

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — all entries build (main/preload/renderer)
- [ ] `npm start` — Electron launches without errors

---

## Dashboard

- [ ] Dashboard loads as default view on app start
- [ ] "Where am I?" section shows Phase, Sprint, progress bar, Sprint pills, baseline, branch, HEAD
- [ ] "Is the project healthy?" section shows Working Tree status
- [ ] Typecheck/Build checks run when "Run now" is clicked
- [ ] "What should I do next?" shows prioritized actions
- [ ] ProjectBrain widget shows Current Focus, milestone, last updated
- [ ] RecentActivity collapsible panel works

---

## Internationalization

- [ ] Dashboard text displays in English by default
- [ ] Menu: Settings > Language > 简体中文 switches to Chinese
- [ ] All Dashboard sections translate correctly
- [ ] Language persists across app restart

---

## Sessions

- [ ] Create new session via Sidebar "+" button
- [ ] Switch between sessions
- [ ] Delete session
- [ ] Session messages persist across app restart
- [ ] Session flush on window close works

---

## Project Brain

- [ ] `workspace/brain/` directory created on first launch
- [ ] `project.json` has correct defaults
- [ ] `architecture.json` has 4 layers + 4 key abstractions
- [ ] `decisions.json` has 2 ADR entries
- [ ] `current-focus.json` reflects current milestone

---

## Context Injection

- [ ] ContextBuilder compiles without errors
- [ ] All 8 sections registered in ContextSectionRegistry
- [ ] BudgetAllocator respects required sections + priority order
- [ ] Debug output written to `workspace/debug/context.md` in dev mode
- [ ] HermesAdapter has zero modifications

---

## Architecture Compliance

- [ ] No "hermes" string in any renderer `.tsx` file (except `session.ts:56` — known tech debt)
- [ ] No renderer file imports from `src/main/`
- [ ] No IPC channel leaks adapter names
- [ ] ContextBuilder imports no Adapter class

---

## Fresh Clone

- [ ] `git clone` + `npm install` + `npm run typecheck` + `npm run build` — all pass
- [ ] `npm start` — Electron launches
- [ ] Dashboard loads with real data (not error state)
- [ ] Brain files seeded on first launch

---

## Documentation

- [ ] `CHANGELOG.md` updated with v0.2.0 entries
- [ ] `ROADMAP.md` reflects v0.2.0 completion
- [ ] `PROJECT_CONTEXT.md` filled with current session
- [ ] `architecture/08_CONTEXT_INJECTION.md` accurate
- [ ] No stale references to v0.1.0 in architecture docs
