# TODO

Current Phase:

Phase 3 — Workspace Intelligence

---

# Sprint 1

Phase 1 — Foundation (v0.1.0)

* [x] M1: Create Electron project
* [x] M2: React + TypeScript + Tailwind
* [x] M3: Application Shell + Chat layout
* [x] M4: ProcessAgentRuntime + Hermes adapter
* [x] M5: Conversation Rendering (6 MessagePart types)

---

# Sprint 2

Phase 2 — Dashboard + Brain (v0.2.0)

* [x] M6: Dashboard — 3-question layout, i18n, Workspace Identity
* [x] M7: Project Brain v1 — 4 brain files, BrainProvider
* [x] M8: Context Injection — ContextBuilder pipeline

---

# Sprint 3

Phase 3 — Workspace Intelligence (v0.3.0)

* [x] M9a: Workspace Provider skeleton
* [x] M9b: Workspace Root + Path Resolution
* [x] M9.5: Shared Resource Model
* [x] M10a: Workspace Explorer tree
* [x] M10b: File preview (read-only)
* [x] M10.5: Design System Foundation
* [x] M10.8a: Workspace UX architecture freeze
* [x] M10.8b: Move Preview to App Root
* [x] M10.9: Workspace operations (write/rename/mkdir/delete/copy/move)
* [x] M10.95: Workspace Tool Runtime Foundation
* [x] M11a: Metadata Index Foundation
* [x] M11b: Metadata Search Provider
* [x] M11c: Command System Architecture Freeze
* [x] M11c.5: Command System Architecture Verification

---

# Sprint 4

Phase 3 — Command System + Editor (current)

* [x] M11d.1: Command Registry (metadata only, no execute)
* [x] M11d.2: Command Executor
* [x] M12a: Editor Architecture Freeze (documentation only)
* [x] M12b: Editor Skeleton (EditorPanel, EditorStore, EmptyEditor, EditorToolbar)
* [x] M11e: Command Palette UI (Ctrl+P)
* [x] M11f: Wire existing actions as Commands
* [x] M12: Code Manipulation Foundation (write audit, diff skeleton)
* [x] M13: Development Intelligence (construction plan complete, implementation complete)

---

# Sprint 5

Phase 3 — Diff + Patch

* [x] M12: Diff View
* [x] M12: Accept / Reject
* [x] M12: Patch application (command registered + handler stub; full implementation deferred)
* [x] M13.6: Release Documentation Synchronization (current)

---

# Sprint 6 — v0.4.0+

Phase 3 — Remaining + Phase 4 Prep

* [ ] editor.apply-patch full implementation (command registered, handler stub exists)
* [ ] Monaco/CodeMirror editor upgrade (textarea is sufficient for skeleton)
* [ ] Undo/Redo stack
* [ ] Multi-project support (Phase 4)
* [ ] Full-text workspace search (`searchText` + `glob` stubs exist)
* [ ] Plugin system foundation
* [ ] AI tool calling through Command System (currently agents use CLI tools)

---

# Sprint Goal

Replace PowerShell for daily Hermes usage — then surpass it.

v0.3.0 goal: intelligent workspace with editing, commands, and development awareness.
