# 00 — Bootstrap

**For every AI agent that begins working on AI Studio for the first time.**

---

## Step 1 — Understand Your Role

You are a software engineering contributor to AI Studio.

You are not:
- The product owner
- The project architect
- A code generator

Your job is to help this project evolve while preserving its long-term health. You are one developer among many — human and AI alike.

Read `docs/00_SOUL.md` before proceeding. That document defines the character expected of every contributor.

---

## Step 2 — Read the Essential Documents

Read these files in order. Do not skip any.

### First: The Constitution

```
docs/00_SOUL.md
```

This defines WHO you should be as a contributor.

### Second: The Project Definition

```
docs/01_PROJECT.md
architecture/01_PROJECT_VISION.md
```

These define WHAT AI Studio is and WHY it exists.

### Third: The Architecture

```
architecture/02_ARCHITECTURE.md
docs/04_ARCHITECTURE.md
```

These define HOW the system is structured. The `architecture/` version is the long-term view; the `docs/` version is the operational view.

### Fourth: The Rules

```
architecture/03_DESIGN_PRINCIPLES.md
docs/06_PRINCIPLES.md
```

These define the permanent constraints. Never violate them.

### Fifth: Current State

```
architecture/04_ROADMAP.md
docs/03_ROADMAP.md
docs/09_TODO.md
```

These define WHERE we are and WHAT we're doing now.

### Sixth: How We Work

```
architecture/05_DEVELOPMENT_PROTOCOL.md
architecture/06_COLLABORATION.md
docs/07_DEVELOPMENT_WORKFLOW.md
```

These define HOW development happens and HOW humans and AI collaborate.

---

## Step 3 — Verify the Build

First, install dependencies if needed:

```bash
npm install
```

Then verify the build:

```bash
npm run typecheck
npm run build
```

If either fails, STOP. Report the failure. Do not begin any development until the build is clean.

To run the app in development mode (with hot reload):

```bash
npm run dev
```

---

## Step 4 — Understand the Current Sprint

Read `docs/09_TODO.md`. Identify:
- Current Phase
- Current Sprint
- Completed tasks
- Remaining tasks

Read `logs/development.md` for the history of completed milestones.

Read `decisions/` for Architecture Decision Records (ADRs) — these explain WHY key technical choices were made.

Do NOT work on future Sprints. Do NOT invent new features. Focus on the current Sprint.

---

## Step 5 — Check Git Status

```bash
git status
git log --oneline -10
```

Understand:
- Whether the working tree is clean
- What the last few commits were
- Whether there are uncommitted changes that need attention

If there are uncommitted changes, check whether they are WIP from a previous session or intentional work to continue.

---

## Step 6 — Load Project Context

Read `architecture/07_PROJECT_CONTEXT.md` for:
- What happened in the last session
- Any pending decisions or open questions
- Known issues the previous contributor was tracking

If the file contains `(to be filled)` everywhere, this is the first session after AKB creation — there is no prior context to load.

---

## Step 7 — Begin Work

Only after completing Steps 1-6 should you begin development. Follow the workflow in `docs/07_DEVELOPMENT_WORKFLOW.md`.

---

## Quick Reference

| Question | Answer Location |
|---|---|
| What is this project? | `architecture/01_PROJECT_VISION.md` |
| How is it built? | `architecture/02_ARCHITECTURE.md` |
| What are the rules? | `architecture/03_DESIGN_PRINCIPLES.md` |
| What are we doing now? | `architecture/04_ROADMAP.md` + `docs/09_TODO.md` |
| How is AIStudio developed? | `architecture/05_DEVELOPMENT_PROTOCOL.md` |
| How do I work with the human? | `architecture/06_COLLABORATION.md` |
| What happened last session? | `architecture/07_PROJECT_CONTEXT.md` |
| What technologies do we use? | `docs/05_TECH_STACK.md` |
| What's the development workflow? | `docs/07_DEVELOPMENT_WORKFLOW.md` |
