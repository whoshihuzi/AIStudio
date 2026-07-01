# ARCHITECTURE

AI Studio follows a layered architecture.

No module may bypass these layers.

**Last synced: 2026-07-01 — matches v0.3.0 implementation.**

---

# Layer Structure

Presentation

↓

Application

↓

Domain

↓

Infrastructure

---

# Presentation Layer

Responsibilities:

User Interface (React + TypeScript)

Interaction

Rendering

Window Management (Electron BrowserWindow)

Theme

Command Palette overlay

No business logic.

---

# Application Layer

Responsibilities:

Coordinate workflows.

Manage conversations.

Manage sessions.

Dispatch commands (CommandExecutor + handlers).

DashboardService — single entry point for all Dashboard data.

SessionPersistence — auto-save with exit flush.

No business logic derivation — renders pre-computed data.

---

# Domain Layer

Core concepts (in `src/shared/`):

Conversation, Message, Workspace, Project, Task, Agent, Memory, Plugin, Artifact, Checkpoint

Command types — CommandMeta, CommandDefinition, CommandContext, CommandResult

Development Intelligence types — DevelopmentState, WorkingSet, ChangedFile, etc.

Editor types — DocumentMetadata, EditorState, DiffHunk, WriteAuditEntry

The Domain layer contains the business rules.

No UI.

No framework.

No Electron code.

---

# Infrastructure Layer

Responsibilities:

Runtime Manager — ProcessAgentRuntime, adapters, session store

WorkspaceProvider — file I/O through single write gate + WriteAuditTrail

CommandRegistry + CommandExecutor — handler-based command dispatch

DevelopmentIntelligenceService — pure composition of 8 analysis engines

Dashboard providers — GitProvider, TodoProvider, BrainProvider, etc.

WorkspaceIndexStore + SearchProvider — metadata index

FileSystem, Git, Configuration, Logging

Infrastructure serves the Domain.

Never the reverse.

---

# Dependency Rules

Presentation depends on Application

Application depends on Domain + Infrastructure

Domain depends on nothing

Infrastructure depends on Domain

---

# Future Extension

Future AI agents should only require implementing: IAgentRuntime

Future plugins should only require implementing: IPlugin

Future memory systems should only require implementing: IMemory

The architecture should remain stable even if every implementation changes.
