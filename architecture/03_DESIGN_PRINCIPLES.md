# 03 — Design Principles

**Permanent rules that govern every decision in AIStudio. These do not change between phases.**

---

## 1. Agent Agnosticism

**The Renderer must never know which AI agent is running.**

- No adapter name (`"hermes"`, `"claude"`) may appear in any Renderer file
- IPC API uses generic names: `agent.send`, `agent.abort`, `agent.onEvent`
- Session meta stores `{runtime, adapter}` as extensible key-value pairs
- Adding a new agent requires: one new Adapter class + one line in the registry

**Enforcement**: If you find the string `"hermes"` (lowercase) in any file under `src/renderer/`, it's a bug.

---

## 2. Layer Isolation

**Each layer may only depend on the layer below it.**

```
Presentation → Application → Domain ← Infrastructure
```

- Presentation (React components): rendering only, no business logic
- Application (Zustand stores): workflows, coordination, state
- Domain (types/interfaces): pure abstractions, no framework code
- Infrastructure (main process): file system, processes, external APIs

**Enforcement**: An `import` crossing layers in the wrong direction is an architectural violation.

---

## 3. The Documentation Is the Source of Truth

**If documentation and implementation disagree, documentation wins until explicitly updated.**

- Never silently change architecture to match code
- Never silently change docs to match a shortcut
- When they conflict: report the inconsistency, discuss, then update both

---

## 4. Small, Reversible Changes

**Every commit should be small enough to revert without collateral damage.**

- Prefer 5 commits of 50 lines over 1 commit of 250 lines
- Each commit should have a single, clear purpose
- The project must build and typecheck on every commit

---

## 5. Pure Functions Over Side Effects

**Prefer pure functions with explicit inputs and outputs.**

- `parseLine(line: string): AgentEvent[]` — pure, testable
- Avoid functions that mutate shared state implicitly
- Side effects (file I/O, process spawn) belong at the boundaries

---

## 6. Explicit Over Implicit

**Make every dependency, every assumption, and every decision visible.**

- No magic strings that carry hidden meaning
- No implicit type coercion
- No "clever" abstractions that hide complexity
- If a function does something surprising, its name should say so

---

## 7. Composition Over Inheritance

**Prefer composing small, focused pieces over deep class hierarchies.**

- `ProcessAgentRuntime` is abstract because it models a real abstraction (any CLI agent)
- `HermesAdapter` is thin (40 lines) because it only provides the Hermes-specific parts
- Future adapters should be equally thin

---

## 8. Fail Fast, Fail Loud

**Catch errors at the earliest possible point and report them clearly.**

- `try/catch` in IPC handlers — never let an unhandled error crash the app silently
- Error states in every UI component (not just loading spinners that spin forever)
- Console errors in main process should be visible in dev tools

---

## 9. Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Files | kebab-case | `agent-bridge.ts` |
| React components | PascalCase | `ChatView.tsx` |
| Interfaces | `I` prefix | `IAgentRuntime` |
| Types | PascalCase | `MessagePart` |
| Functions | camelCase | `saveCurrentSession` |
| IPC channels | `domain:action` | `session:save`, `agent:send` |
| Zustand stores | `use` prefix | `useChatStore` |

---

## 10. Configuration, Not Code

**Project-specific settings belong in configuration files, not in source code.**

- Adapter registry is a plain object, not a `switch` statement
- Session paths are derived from `process.cwd()`, not hardcoded
- Future: model selection, theme, and plugin configuration in JSON/YAML

---

## 11. The Renderer Has No File System

**The Renderer process has `contextIsolation: true` and `nodeIntegration: false`.**

- All file I/O must go through IPC to the main process
- The preload script is the ONLY bridge
- Never expose `fs`, `path`, or `child_process` to the Renderer

---

## 12. TypeScript Strict Mode

**`strict: true` is non-negotiable.**

- No `any` without explicit justification
- `noUncheckedIndexedAccess: true`
- All function signatures have explicit return types (for exported functions)

---

## 13. Tests for Domain Logic

**Domain-layer code and IPC handlers must have tests.**

- Pure functions in the Domain layer (`parseLine`, message construction) are trivially testable — test them
- IPC handlers that bridge process boundaries need integration-level verification
- UI components may use manual verification until Playwright is introduced (Phase 2+)
- The testing framework is Vitest (see `docs/05_TECH_STACK.md`)
- Tests live in `tests/` mirroring the source structure

**Enforcement**: Every PR that modifies Domain or IPC code should include or update tests.

---

## 14. Internationalization by Default

**Every user-facing string must go through the i18n layer.**

- Components use `useTranslation()` → `t.key.path` for all visible text
- English (`en.ts`) is the canonical key source — all other locales must match its structure
- Adding a new TranslationKey to `en.ts` creates a compile error until `zh-CN.ts` is updated
- Providers, Services, and Validation logic remain in English (they are not user-facing)
- Language state persists to `workspace/config.json`, survives app restart
- Switching language does not require restart — `LanguageProvider` re-renders instantly
- Adding a new locale requires: one new file + one entry in `LOCALES` map + menu item
- The `Translations` interface in `types.ts` is the single source of truth for key structure

**Enforcement**: A hardcoded English string in any component is a bug. Exception: console logs and error messages intended for developers.

---

## 15. Workspace Identity

**Every dashboard must identify which project it represents.**

- `ProjectInfoProvider` composes `GitProvider` + `config-store` — does not duplicate Git logic
- Workspace identity includes: project name, absolute path, branch, latest tag, HEAD, clean/dirty
- `workspace/config.json` stores persistent metadata: `projectName`, `workspacePath`, `createdAt`
- The Dashboard header is the authoritative display of workspace identity — not a title bar
- Activity state (`idle` / `refreshing` / `running-checks` / `building` / `typechecking`) is global — components never maintain their own loading flags
- Renderer receives `ProjectInfo` via `project:get-info` IPC — never accesses Git or filesystem

---

## 16. Project Brain — Canonical AI Context

**The Project Brain is the single source of long-term AI context.**

- `workspace/brain/` stores structured JSON with strict TypeScript schemas — no free-form JSON
- Four files: `project.json`, `architecture.json`, `decisions.json`, `current-focus.json`
- `BrainProvider` reads Brain data; `DashboardService` aggregates it; Renderer never touches `workspace/brain/`
- Three distinct knowledge layers, no overlap:
  - **Docs** (`docs/`) — for humans: product specs, roadmaps, workflows
  - **Brain** (`workspace/brain/`) — for AI: structured project metadata, architecture, decisions, focus
  - **Session** (`workspace/sessions/`) — for one conversation: message history, ephemeral context
- Brain is read-only in v1; future versions will add editing capability
- Default seed data ensures Brain is never empty on first launch

---

## Violation Response

If you find code that violates these principles:

1. Do NOT silently refactor it
2. Report what you found and which principle it violates
3. Propose a fix
4. Wait for approval before changing

These principles exist because they were learned through hard experience. Every violation has a story behind it.
