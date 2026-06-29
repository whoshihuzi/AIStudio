# TECH STACK

This document defines the official technology choices for AI Studio.

No AI agent may replace these technologies without explicit approval.

The purpose of this document is to maintain long-term consistency.

---

# General Principles

Choose mature technologies.

Prefer stability over novelty.

Prefer ecosystem over hype.

Prefer maintainability over optimization.

Avoid unnecessary dependencies.

---

# Desktop Framework

Electron

Reason:

* Mature ecosystem
* Excellent Windows support
* Large community
* Compatible with Monaco Editor
* Compatible with xterm.js
* VS Code proves long-term viability

Rejected:

Tauri

Reason:

Smaller ecosystem.

Some libraries have weaker compatibility.

Not suitable for rapid iteration during early development.

---

# Frontend Framework

React

Reason:

Largest ecosystem.

Excellent AI coding support.

Rich component libraries.

Future contributors are more likely to understand React.

Rejected:

Vue

Angular

Svelte

---

# Language

TypeScript

Reason:

Static typing.

Better AI-generated code quality.

Lower maintenance cost.

---

# Styling

Tailwind CSS

Reason:

Fast iteration.

Easy theme management.

Modern ecosystem.

---

# UI Components

shadcn/ui

Reason:

Based on Radix UI.

Highly customizable.

Professional appearance.

No vendor lock-in.

---

# Icons

Lucide

Reason:

Consistent.

Open Source.

Lightweight.

---

# Code Editor

Monaco Editor

Reason:

VS Code editor.

Excellent language support.

Diff Editor included.

Industry standard.

---

# Terminal

xterm.js

Reason:

Most mature web terminal.

ANSI support.

Streaming output.

---

# Markdown

react-markdown

Reason:

Simple.

Stable.

Easy plugin ecosystem.

---

# Diagrams

Mermaid

Reason:

Industry standard.

Markdown compatible.

---

# Math

KaTeX

Reason:

Fast rendering.

Excellent compatibility.

---

# State Management

Zustand

Reason:

Simple.

Minimal boilerplate.

Easy for AI agents to understand.

---

# Database

SQLite

Reason:

Embedded.

No server required.

Reliable.

Suitable for desktop software.

---

# Configuration

JSON

Reason:

Human-readable.

Simple.

Easy migration.

---

# Plugin System

ES Modules

Dynamic Import

Reason:

Native JavaScript support.

Future extensibility.

---

# Logging

Structured Logging

Timestamp

Level

Component

Never use plain console.log for production logging.

---

# Testing

Vitest

Playwright (Future)

---

# Rule

Changing any official technology requires:

1. Technical justification.

2. Impact analysis.

3. Migration plan.

4. Human approval.
