# PRINCIPLES

This document defines the permanent development rules of AI Studio.

Every AI agent must obey these rules.

---

# Rule 1

The project must always remain runnable.

Every completed Sprint must compile successfully.

---

# Rule 2

One Sprint.

One Goal.

Avoid implementing multiple unrelated features together.

---

# Rule 3

Never perform large-scale refactoring without approval.

If more than 20 files will be modified:

Stop.

Generate a plan.

Wait for approval.

---

# Rule 4

UI contains no business logic.

Business logic belongs to the Domain layer.

---

# Rule 5

Never duplicate code.

Extract reusable abstractions.

---

# Rule 6

Every feature should consider future plugin support.

---

# Rule 7

Every new module should expose clear interfaces.

Avoid hidden dependencies.

---

# Rule 8

Prefer readable code over clever code.

Future maintainability is more important than short-term optimization.

---

# Rule 9

Document important architectural decisions.

Never rely on memory.

---

# Rule 10

Every Sprint must update:

TODO

CHANGELOG

Documentation

---

# Rule 11

When uncertain:

Do not guess.

Explain alternatives.

Request human guidance.

---

# Rule 12

The documentation is the source of truth.

The implementation follows the documentation.

Never reverse this relationship.

---

# Rule 13

Infrastructure problems must be solved as infrastructure problems.

Never compensate for environment failures by modifying application code.
