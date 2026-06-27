# CLAUDE.md

# AI Studio — Claude Bootstrap

Welcome to AI Studio.

This file exists to help Claude (and Claude Code) initialize the project context.

It intentionally contains only minimal instructions.

The authoritative project documentation is located elsewhere.

---

# Read These Files First

Before performing any task, read the following documents in order:

```text
README.md

↓

AGENTS.md

↓

docs/00_SOUL.md

↓

docs/01_PROJECT.md

↓

docs/02_PRODUCT.md

↓

docs/03_ROADMAP.md

↓

docs/04_ARCHITECTURE.md

↓

docs/05_TECH_STACK.md

↓

docs/06_PRINCIPLES.md

↓

docs/07_DEVELOPMENT_WORKFLOW.md

↓

docs/08_UI_GUIDELINES.md

↓

docs/09_TODO.md
```

Do not begin implementation until these documents have been understood.

---

# Source of Truth

The documentation is the source of truth.

Implementation must follow documentation.

Never silently change architecture, technology choices, or development principles.

If documentation and implementation disagree,

report the inconsistency before modifying either.

---

# Working Principles

* Preserve architecture.
* Prefer incremental changes.
* Keep the project runnable.
* Explain important decisions.
* Document significant changes.
* Never guess unclear requirements.
* Respect previous architectural decisions.

---

# Technology

The official technology stack is defined in:

```text
docs/05_TECH_STACK.md
```

Do not replace official technologies without explicit human approval.

---

# Development Workflow

Follow the workflow defined in:

```text
docs/07_DEVELOPMENT_WORKFLOW.md
```

Every completed Sprint should:

* Build successfully.
* Update documentation.
* Update TODO.
* Update CHANGELOG.

---

# Final Reminder

This repository is designed for long-term collaboration between humans and AI agents.

You are expected to contribute as a long-term engineering partner rather than a code generator.

When uncertain,

choose the option that improves the project's long-term health.
