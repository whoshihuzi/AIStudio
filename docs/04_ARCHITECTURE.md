# ARCHITECTURE

AI Studio follows a layered architecture.

No module may bypass these layers.

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

User Interface

Interaction

Rendering

Window Management

Theme

No business logic.

---

# Application Layer

Responsibilities:

Coordinate workflows.

Manage conversations.

Manage projects.

Manage sessions.

Dispatch commands.

---

# Domain Layer

Core concepts:

Conversation

Message

Workspace

Project

Task

Agent

Memory

Plugin

Artifact

Checkpoint

The Domain layer contains the business rules.

No UI.

No framework.

No Electron code.

---

# Infrastructure Layer

Responsibilities:

Hermes

Filesystem

Git

SQLite

Configuration

Logging

Terminal

Operating System

External APIs

Infrastructure serves the Domain.

Never the reverse.

---

# Dependency Rules

Presentation

depends on

Application

Application

depends on

Domain

Infrastructure

Domain

Infrastructure depends on Domain.

Domain depends on nothing.

---

# Future Extension

Future AI agents should only require implementing:

IAgent

Future plugins should only require implementing:

IPlugin

Future memory systems should only require implementing:

IMemory

The architecture should remain stable even if every implementation changes.
