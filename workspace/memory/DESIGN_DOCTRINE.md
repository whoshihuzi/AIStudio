# DESIGN_DOCTRINE

This document records the recurring design decisions of AI Studio.

Unlike Architecture documents, it explains why decisions were made.

---

## Workspace First

Everything belongs to the Workspace.

Dashboard, Preview, Editor, Search, Git, Brain, Sessions and Commands are Workspace capabilities.

They are not separate applications.

---

## Provider Pattern

Providers expose capabilities.

Providers never know about UI.

Providers never know about AI runtimes.

Providers should remain reusable.

---

## Context Injection

Runtime should never build project context.

Context is assembled before Runtime execution.

This keeps every AI backend interchangeable.

---

## Command System

Buttons should not execute business logic.

Menus should not execute business logic.

Keyboard shortcuts should not execute business logic.

AI agents should not execute business logic.

Everything eventually becomes a Command.

---

## Renderer Philosophy

Renderer owns presentation.

Renderer never owns project knowledge.

Renderer never accesses the filesystem.

---

## Preview and Editor

Preview and Editor are independent panels.

Neither owns the other.

Both operate on shared Workspace state.

Future document management should remain independent from UI components.

---

## Documentation First

Major architectural work begins with documentation.

Implementation follows frozen architecture.

Validation follows implementation.

This process has repeatedly reduced architectural rework and should remain the standard workflow.
