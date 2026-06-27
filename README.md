# AI Studio

> **An AI-Native Development Environment for Human & AI Collaboration**

---

# Vision

AI Studio is not a chat application.

It is not a GUI for a single AI model.

It is an AI-native development environment where humans and AI agents collaborate to design, build, test, and evolve software.

Hermes is the first integrated agent, but AI Studio is designed to remain model-agnostic and support any future AI system.

---

# Mission

Build a desktop application that enables AI agents to participate in the complete software development lifecycle.

The long-term vision is for AI Studio to become capable of contributing to its own continuous development.

---

# Project Philosophy

AI Studio is built upon four fundamental principles.

* Humans define the vision.
* Documentation defines the project.
* AI implements the documentation.
* The project evolves through long-term collaboration.

Every architectural decision should make future development easier rather than more complex.

---

# Current Status

**Current Phase**

Phase 1 — Foundation

**Current Goal**

Replace the Hermes command-line workflow with a modern desktop application.

---

# Project Structure

```text
AIStudio/

README.md

docs/
memory/
decisions/
prompts/

src/
plugins/
assets/
tests/
workspace/
```

---

# Project Constitution

The **docs/** directory contains the permanent constitution of AI Studio.

Every AI agent must read these documents before modifying any code.

Recommended reading order:

1. 00_SOUL.md
2. 01_PROJECT.md
3. 02_PRODUCT.md
4. 03_ROADMAP.md
5. 04_ARCHITECTURE.md
6. 05_TECH_STACK.md
7. 06_PRINCIPLES.md
8. 07_DEVELOPMENT_WORKFLOW.md
9. 08_UI_GUIDELINES.md
10. 09_TODO.md
11. 10_CHANGELOG.md

The documentation is the single source of truth.

The implementation must follow the documentation.

Never the other way around.

---

# Long-Term Vision

AI Studio is designed to evolve beyond a single application.

It aims to become an operating environment for AI-assisted software engineering, where multiple AI agents and human developers collaborate through shared architecture, documentation, and long-term memory.

One day, AI Studio should become the primary tool used to continue developing AI Studio itself.
