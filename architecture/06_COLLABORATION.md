# 06 — Collaboration

**How humans, AI agents, and AIStudio work together.**

---

## The Three Entities

AIStudio involves three distinct entities, each with a clear role:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    HUMAN     │     │  AI AGENT    │     │   AISTUDIO   │
│              │     │              │     │              │
│  Alice Zhang │     │  Hermes      │     │  The IDE     │
│  (Product    │     │  Claude      │     │  (Electron   │
│   Owner)     │     │  GPT         │     │   desktop    │
│              │     │  Future...   │     │   app)       │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │   Owns vision      │                    │
       │───────────────────►│                    │
       │                    │                    │
       │   Approves plans   │                    │
       │───────────────────►│                    │
       │                    │                    │
       │                    │   Runs inside      │
       │                    │◄──────────────────►│
       │                    │                    │
       │   Reviews output   │                    │
       │◄───────────────────│                    │
       │                    │                    │
```

---

## Role Boundaries

### The Human

**Owns**: Product vision, roadmap, architecture approval, final decisions.

**Does NOT do**: Implementation details, code generation, repetitive mechanical work.

**Protocol**: The human speaks in intent ("I want to add feature X"). The human approves or rejects plans. The human reviews output. The human never types code that an AI could write.

### The AI Agent

**Owns**: Implementation, analysis, planning (subject to approval), documentation updates, testing.

**Does NOT do**: Product decisions, architecture changes without approval, working on unapproved Sprints, inventing requirements.

**Protocol**: The AI agent reads documentation first, proposes plans, waits for approval, implements incrementally, verifies, documents.

### AIStudio (the IDE)

**Owns**: Providing the shared workspace, maintaining session context, persisting project state, routing communication between human and AI.

**Does NOT do**: Make decisions. AIStudio is infrastructure, not a participant.

---

## Communication Protocol

### Human → AI Agent

```
Human describes intent
    ↓
AI reads project context (AKB, docs, source)
    ↓
AI proposes a plan
    ↓
Human: "Approved" / "Change X" / "Let's discuss Y"
    ↓
AI implements (or revises plan)
```

**Key rule**: The AI NEVER begins implementation without explicit approval for non-trivial changes.

### AI Agent → Human

```
AI reports progress:
    - What was done
    - What was verified
    - What's next
    - Any issues encountered
    ↓
Human acknowledges or redirects
```

**Key rule**: The AI always reports honestly. Uncertainty is stated explicitly.

### AI Agent → AIStudio

```
AI reads/writes through AIStudio's IPC:
    - agent:send → start a task
    - agent:event ← receive streaming output
    - session:save → persist state
```

**Key rule**: The AI uses AIStudio as its medium, never bypassing it (e.g., writing files directly to disk without going through IPC).

---

## Session Protocol

Each development session follows the Development Lifecycle defined in `05_DEVELOPMENT_PROTOCOL.md`. The human-AI interaction within that lifecycle follows the communication protocols above.

In brief: Bootstrap → Context → Understand → Plan → Implement → Document → Handoff. See the Development Protocol for detailed steps and quality gates at each phase.

---

## Decision Authority Matrix

| Decision Type | Human | AI Agent |
|---|---|---|
| Product vision | Decides | Follows |
| Architecture changes | Approves | Proposes |
| Technology replacement | Approves | Never proposes without strong justification |
| Implementation approach | Reviews | Proposes + executes |
| Bug fixes | Notified | Executes (small fixes) / Proposes (large fixes) |
| Documentation updates | Reviews | Executes |
| Sprint prioritization | Decides | Recommends |
| Code style | Sets rules | Follows rules |
| Testing strategy | Approves | Proposes + executes |

---

## Escalation Protocol

When the AI Agent encounters a situation it cannot resolve:

1. **Unclear requirements**: State what's unclear. Present 2-3 alternatives. Wait.
2. **Architecture conflict**: Report the inconsistency. Do NOT silently pick a side.
3. **Technical blocker**: Report what failed, what was tried, what might work. Ask for direction.
4. **Build failure not caused by current changes**: Report. Do NOT fix pre-existing issues without asking.

**Never**: Invent an answer, hide uncertainty, or proceed without approval on ambiguous matters.

---

## Long-Term Vision

As AIStudio matures (Phase 4-5), the collaboration model evolves:

```
Phase 1-3: Human → AI Agent (directed)
    Human decides, AI implements

Phase 4: Human ↔ AI Agent (collaborative)
    Human and AI negotiate plans, AI executes with approval gates

Phase 5: Human ⇔ AI Agent (autonomous with oversight)
    AI proposes and executes, human reviews at checkpoints
```

But even at Phase 5, the human retains final authority. AIStudio never becomes autonomous in product decisions.
