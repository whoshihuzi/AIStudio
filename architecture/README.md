# Architecture Knowledge Base (AKB)

Welcome to the Architecture Knowledge Base of AI Studio.

## What This Is

The AKB is the permanent, long-term knowledge repository for AI Studio. It exists so that any AI agent — whether Hermes, Claude, GPT, Gemini, or a future system — can understand the project without reading every source file.

The AKB is NOT:
- A copy of `docs/` (those are the operational manuals)
- A code-level reference (that lives in the source)
- A changelog or TODO list

The AKB IS:
- The distillation of every architectural decision made so far
- The reasoning behind those decisions
- The rules that should never be broken
- The map that lets any contributor find their way

The AKB is NOT:
- A copy of `docs/` (those are the operational manuals)
- A code-level reference (that lives in the source)
- A changelog or TODO list

## What the AKB Does NOT Cover

The AKB intentionally does NOT include:
- **Daily operational procedures** — these belong in `docs/07_DEVELOPMENT_WORKFLOW.md`
- **Sprint-level TODO items** — these belong in `docs/09_TODO.md`
- **Build configurations** — these belong in `package.json`, `tsconfig.json`, `electron.vite.config.ts`
- **UI mockups and guidelines** — these belong in `docs/08_UI_GUIDELINES.md`
- **Code-level API documentation** — this belongs with the source (JSDoc, type definitions)

When in doubt about where something belongs: if it changes every Sprint, it goes in `docs/`. If it should survive multiple Phases, it goes in `architecture/`.

## Reading Order

Follow the guided bootstrap in `00_BOOTSTRAP.md`. It walks through every document in the correct order with context on WHY each one matters.

Quick reference:

| Question | Answer Location |
|---|---|
| What should I do first? | `00_BOOTSTRAP.md` |
| What is this project? | `01_PROJECT_VISION.md` |
| How is it built? | `02_ARCHITECTURE.md` |
| What are the rules? | `03_DESIGN_PRINCIPLES.md` |
| What are we doing now? | `04_ROADMAP.md` + `docs/09_TODO.md` |
| How is AIStudio developed? | `05_DEVELOPMENT_PROTOCOL.md` |
| How do I work with the human? | `06_COLLABORATION.md` |
| What happened last session? | `07_PROJECT_CONTEXT.md` |
| How does Context Injection work? | `08_CONTEXT_INJECTION.md` |
| How will Workspace work? | `09_WORKSPACE_INTELLIGENCE.md` |
| What is the Workspace API? | `10_WORKSPACE_PROVIDER_API.md` |
| What are the v0.3 milestones? | `11_V0.3_MILESTONE_DESIGN.md` |
| What's the v0.3 architecture review? | `12_V0.3_ARCHITECTURE_REVIEW.md` |
| How does Workspace UX work? | `13_WORKSPACE_UX.md` |
| How does Command System work? | `14_COMMAND_SYSTEM.md` |
| How does Editor work? | `15_EDITOR_ARCHITECTURE.md` |
| What technologies do we use? | `docs/05_TECH_STACK.md` |
| What's the development workflow? | `docs/07_DEVELOPMENT_WORKFLOW.md` |
| Why were key decisions made? | `decisions/` |

## Relationship to Other Documentation

```
architecture/        ← Long-term knowledge (this directory)
    │
    │  WHY we built it this way
    │  WHAT rules govern it
    │  HOW to think about it
    │
    ▼
docs/                ← Operational manuals
    │
    │  Current phase and Sprint
    │  Day-to-day development workflow
    │  UI guidelines
    │
    ▼
Source code          ← Implementation
    │
    │  The running system
    │  Must follow both architecture/ and docs/
```

## Long-term AI Memory

The `architecture/` documents describe the **system** — its structure, rules, and evolution.

The `workspace/memory/` documents describe the **project** — its engineering philosophy, recurring design decisions, and long-term intent.

These two bodies of knowledge serve different purposes:

| Directory | Scope | Answers |
|---|---|---|
| `architecture/` | System design | HOW the system is built, WHY decisions were made |
| `workspace/memory/` | Project philosophy | WHAT the project believes, WHERE it is heading |

Both are mandatory reading for every AI agent. Neither can substitute for the other.

The `workspace/memory/` documents are:

- **PROJECT_MEMORY.md** — What AI Studio is, its engineering philosophy, core architectural beliefs, and long-term direction
- **DESIGN_DOCTRINE.md** — Recurring design decisions and the reasoning behind them (Workspace First, Provider Pattern, Context Injection, Command System, etc.)
- **EVOLUTION_MAP.md** — Expected long-term capability evolution, independent of release planning

These documents capture intent that cannot be recovered from source code or architecture diagrams alone. They should be read immediately after this README, before beginning the bootstrap in `00_BOOTSTRAP.md`.

---

## Maintenance

- The AKB should be updated whenever an architectural decision is made
- It should be reviewed at the start of each new Phase
- If a rule in `03_DESIGN_PRINCIPLES.md` is broken, either the code or the principle must change — never let them drift apart

## Current Version

AKB v1.0 — Created at the start of v0.2.0 development (Project Awareness Dashboard).
