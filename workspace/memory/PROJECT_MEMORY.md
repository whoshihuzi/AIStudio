# PROJECT_MEMORY

Version: 1.0

Purpose

This document records the long-term memory of the AI Studio project.

It is not a changelog.

It is not architecture documentation.

It captures the intentions, engineering philosophy and project direction that are difficult to recover from code alone.

Every AI agent joining this repository should read this document before starting development.

---

## What AI Studio Is

AI Studio is not a chat application.

AI Studio is not an IDE built around a specific AI model.

AI Studio is a Workspace Operating System.

The Workspace is the permanent center of the system.

Everything else—including dashboards, editors, runtimes, commands and AI agents—is a capability of the Workspace.

---

## Engineering Philosophy

Architecture comes before implementation.

The preferred workflow is:

Architecture

↓

Freeze

↓

Skeleton

↓

Integration

↓

Validation

↓

UI

↓

Polish

Documentation should be written before implementation whenever practical.

---

## Core Architectural Beliefs

* Renderer renders state.
* Main Process owns project knowledge.
* Providers own capabilities.
* Services compose Providers.
* Runtime consumes Context.
* AI adapters remain replaceable.
* Commands become the universal execution interface.
* Documents become the universal information model.

---

## Long-term Direction

The project evolves by extending existing abstractions instead of introducing parallel systems.

Workspace

↓

Documents

↓

Commands

↓

Context

↓

Runtime

↓

Agents

↓

Automation

↓

Applications

Each layer should stabilize before the next layer is introduced.

---

## Decision Principle

When multiple implementations are possible, prefer the one that:

* introduces fewer concepts
* reduces coupling
* increases composability
* preserves layer isolation
* keeps the Workspace as the architectural center

Architecture stability is considered more valuable than implementation speed.
