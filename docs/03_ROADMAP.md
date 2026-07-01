# ROADMAP

The project follows iterative development.

Every phase must produce a usable application.

---

# Phase 1 — Foundation (v0.1.0) ✓ Complete

Goal:

Replace PowerShell.

Features:

Application framework

Workspace

Chat

Console

Hermes integration (ProcessAgentRuntime)

Session

Settings

---

# Phase 2 — Dashboard + Brain (v0.2.0) ✓ Complete

Goal:

Project awareness and AI context.

Features:

Dashboard — 3-question layout (Where am I? / Is the project healthy? / What should I do next?)

Project Brain v1 — 4 brain files, BrainProvider

Context Injection — ContextBuilder pipeline

i18n — English + 简体中文

Workspace Identity — project metadata, config.json

---

# Phase 3 — Workspace Intelligence (v0.3.0) ◄ Current

Goal:

Intelligent workspace with editing, commands, and development awareness.

Features (implemented):

Workspace Provider + Explorer — file tree, preview, operations (M9-M10)

Metadata Index + Search — WorkspaceIndexStore, SearchProvider (M11a-b)

Command System — Registry + Executor + Palette UI + 18 commands (M11c-f)

Editor — textarea EditorPanel, EditorToolbar, DiffView, DiffComputer (M12)

Write Audit Trail — in-memory circular buffer, single write gate (M12)

Development Intelligence — 8 engines, DevIntelligenceService, Dashboard integration (M13)

Features (future):

Patch application (`editor.apply-patch` — command registered, implementation pending)

Monaco/CodeMirror editor upgrade

Undo/Redo stack

Search UI (full-text workspace search — provider stub exists)

---

# Phase 4 — Multi-Project

Goal:

Manage multiple projects.

Features:

Project Manager

History

Checkpoint

Project Configuration

---

# Phase 5 — Multi-Agent

Goal:

Support multiple AI agents.

Features:

Agent Interface

Agent Manager

Model Switching

Shared Context

---

# Phase 6 — Workflow

Goal:

AI manages development tasks.

Features:

Task Graph

Pipeline

Approval

Automation

Workflow Builder

---

# Phase 7 — Self Development

Goal:

AI Studio contributes to its own development.

Features:

Architecture Analysis

Automatic Planning

Code Modification

Testing

Release Notes

Continuous Evolution

---

# Rule

No phase may begin before the previous phase reaches a stable state.
