# 01 — Project Vision

## What AI Studio Is

AI Studio is an **AI-Native Integrated Development Environment**.

It is not:
- A chat application (though it contains chat)
- A Hermes GUI (though Hermes is the first integrated agent)
- A code editor (though it will include editing capabilities)
- A terminal replacement (though it will include a terminal)

It is a new category of software: an IDE where AI agents participate as first-class collaborators in the software engineering process.

## Why It Exists

Current AI-assisted development follows a broken pattern:

```
Human writes prompt in terminal
    → AI generates code
    → Human copies code into editor
    → Human tests manually
    → Human writes next prompt
```

AI Studio replaces this with:

```
Human defines intent in AI Studio
    → AI plans the approach
    → AI writes the code
    → Human reviews in-place
    → AI tests and iterates
    → AI deploys
```

The human remains in control, but the AI handles the mechanical work. The human's role shifts from "typist" to "director."

## Core Values

### Human First

Humans own the project. Humans make product decisions. AI implements, suggests, and reports — but never decides product direction.

### Agent Agnostic

Every AI agent is replaceable. The application must never depend on a specific model, provider, or runtime. Hermes is the first adapter, not the only one.

### Architecture Over Speed

Fast progress that destroys structure is not progress. Every decision should make future development easier, not harder.

### Always Runnable

The project must build and run at every commit. Broken builds are not acceptable, even during development.

### Documentation as Product

Knowledge that exists only in an AI agent's context window is knowledge that will be lost. Every important decision must be recorded.

## Product Positioning

AI Studio does not compete with VS Code as a traditional editor. VS Code is optimized for human typing. AI Studio is optimized for human-AI collaboration.

The difference:

| VS Code | AI Studio |
|---|---|
| Human writes code | AI writes code, human reviews |
| Extensions add tools | Agents perform tasks |
| File-centric | Task-centric |
| Single developer | Human + AI team |

## Current Users

**Phase 1**: A single developer (Alice Zhang) using Hermes for daily development work. The goal is to replace PowerShell as the interface to Hermes.

**Future Phases**: Individual developers → Small teams → AI-assisted software companies.

## Success Criteria by Phase

| Phase | Success Means |
|---|---|
| Phase 1 | Hermes can be used entirely through AI Studio. No PowerShell required. |
| Phase 2 | Multiple projects can be managed within AI Studio. |
| Phase 3 | Multiple AI agents (Hermes, Claude, GPT) can be used interchangeably. |
| Phase 4 | AI manages development workflows with human approval gates. |
| Phase 5 | AI Studio contributes to its own development. |

## What AI Studio Will Never Be

- A general-purpose text editor
- A web browser
- An operating system
- A replacement for human judgment

The mission is specific: make AI a first-class collaborator in software engineering. Everything else is out of scope.
