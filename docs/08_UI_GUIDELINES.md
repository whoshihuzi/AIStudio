# UI GUIDELINES

The interface should feel like a professional development environment.

Inspired by:

VS Code

Cursor

Linear

Notion

---

# Layout (v0.3.0)

```
┌──────────────────────────────────────────────────────┐
│ Menu Bar                                             │
├──────────┬───────────────────────────┬───────────────┤
│ Sidebar  │ Main Content              │ Preview Panel │
│          │                           │               │
│ Workspace│ Dashboard / Chat / Editor │ File Preview  │
│ Explorer │                           │ Diff View     │
│ Sessions │                           │               │
├──────────┴───────────────────────────┴───────────────┤
│ Status Bar                                           │
└──────────────────────────────────────────────────────┘
```

**Sidebar**: Workspace Explorer (tree view, context menu, drag/drop) + Session list (create/switch/delete)

**Main Content**: Tab-based switching between Dashboard, Chat, and Editor views

**Preview Panel**: Read-only file preview (right side, shared with Editor Panel)

**Overlays**: Command Palette (Ctrl+P / Ctrl+K modal), keyboard-shortcut driven

---

# Theme

Dark Theme first.

Light Theme later.

---

# Design System

Foundation implemented in M10.5:

- Design tokens: colors, spacing, typography, radii
- Component primitives: Button, Card, Badge, Divider, Spinner, etc.
- Consistent visual language across all widgets

---

# Typography

Readable.

Consistent spacing.

Large code blocks.

Clear hierarchy.

---

# Dashboard (v0.2.0+, refactored v0.3.0)

7-widget layout:

- Current Task — first unchecked TODO.md task
- Milestone Progress — Sprint pills, progress bar
- Workspace Widget — indexed files, directories, last index time
- Project Brain — read-only AI context display
- Is Healthy — Development Intelligence: completion %, warnings, commit readiness
- Today's Recommendation — phase-based next action
- Recent Activity — changed files, related documents

All widgets render from pre-computed data — zero business logic in widgets.

---

# Chat

Streaming response.

Markdown.

Code blocks.

Mermaid.

Math.

6 MessagePart renderers: Text, Code, Thinking, Tool, File, Image

---

# Editor (v0.3.0 — textarea skeleton)

EditorPanel with working textarea

EditorToolbar with dirty indicator (●), Save/Saved button

Ctrl+S / Cmd+S keyboard shortcut

DiffView component (unified/split diff with accept/reject)

4 editor commands: open, save, diff, apply-patch

Single write gate through WorkspaceProvider + WriteAuditTrail

---

# Workspace

Tree view.

Icons.

Context menu.

Drag and drop.

File operations: create, rename, delete, copy, move

---

# Console

Real-time output.

ANSI colors.

Search.

Copy.

Clear.

---

# Command Palette (v0.3.0)

Ctrl+P / Ctrl+K trigger

Semi-transparent backdrop, 560px floating panel

Search across title, description, keywords

Category badges, shortcut hints

ArrowUp/Down navigation with wrap-around, Enter to execute

18 registered commands across 8 categories

---

# Future UI

Split chat.

Multiple workspaces.

Floating panels.

Plugin panels.

Multi-monitor support.

Monaco/CodeMirror editor upgrade.

Undo/Redo stack.
