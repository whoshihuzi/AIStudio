# CHANGELOG

## 2026-06-30 — v0.2.0 (M11d.1)

### Added

**Command Registry**:
- `src/main/runtime/commands/CommandRegistry.ts` — in-memory Command metadata store
  - Methods: register, unregister, get, has, list, listByCategory, search, clear
  - Validation: rejects duplicate IDs, empty IDs, empty titles with descriptive errors
  - Search: case-insensitive across title, description, keywords; sorted by title ASC
  - Thread safety: private Map, immutable from Renderer, Main Process only
- `src/main/runtime/commands/DefaultCommandRegistry.ts` — 10 default commands (metadata only)
  - Commands: dashboard.open, dashboard.refresh, workspace.openFile, workspace.refreshIndex, workspace.search, session.open, session.new, runtime.runChecks, settings.language, preview.close
  - No execute implementations — stub functions marked for replacement in M11d.2
- `docs/command-registry-validation.md` — 9-section verification covering:
  - Registration lifecycle, duplicate protection, empty ID/title protection
  - Search correctness (case-insensitive, multi-field, sort order)
  - Category listing, memory ownership, no-execution guarantee, architecture compliance

---
## 2026-06-30 — v0.2.0 (M11c.5)

### Added

**Command System Architecture Verification**:
- `docs/command-system-review.md` — 8-section architecture review covering:
  - Full action audit: 10 existing user actions traced to Command future (all low migration risk)
  - Module responsibility matrix: 11 modules classified (Consume/Register/Execute/Ignore)
  - Dependency cycle analysis: zero cycles, clean DAG across Registry/Executor/Workspace/Runtime/Renderer
  - Plugin validation: external "Generate README" command without source changes
  - AI agent validation: `workspace.openFile` flow with zero UI knowledge
  - Future compatibility: 9 features validated (Ctrl+P, Ctrl+Shift+P, quick open, tool calling, workflows, plugins, batch)
- `docs/command-migration-plan.md` — 37-item migration table mapping every existing button/menu/action to its future Command
- Architecture verdict: **READY** — no corrections required before M11d implementation

## 2026-06-27 — v0.2.0

### Added

**Project Awareness Dashboard**:
- Three-question Dashboard layout: Where am I? / Is the project healthy? / What should I do next?
- Milestone progress tracking with Sprint pills and progress bar
- Working tree status, typecheck/build quality gates
- Prioritized next-action recommendations from TODO.md
- ProjectBrain widget — read-only AI context display

**Internationalization**:
- i18n infrastructure: English + 简体中文
- Language persistence in `workspace/config.json`
- Electron native menu: Settings > Language
- Real-time language switching without restart

**Workspace Identity**:
- Dashboard header with project name, path, branch, tag, HEAD, clean/dirty
- Global Activity state: idle/refreshing/running-checks/building/typechecking
- `workspace/config.json` for project metadata

**Project Brain (Knowledge Layer)**:
- `workspace/brain/` with 4 structured JSON files (strict TypeScript schemas)
- `project.json`, `architecture.json`, `decisions.json`, `current-focus.json`
- BrainProvider with auto-seeding on first launch

**Data Pipeline**:
- Provider-based architecture: 8 independent providers (Git, Todo, Session, Build, Brain, ProjectInfo, DesignPrinciples, Validation)
- DashboardService as single aggregation entry point
- ValidationProvider for data integrity verification

**Context Injection**:
- ContextBuilder pipeline: Registry → BudgetAllocator → MarkdownFormatter
- 8 context sections automatically injected before every Agent prompt
- Runtime-Agnostic: works for Hermes, Claude, GPT, and future agents
- Token budget control with priority-based allocation
- Debug output to `workspace/debug/context.md` in dev mode

**Architecture Knowledge Base**:
- `architecture/` directory with 9 documents
- BOOTSTRAP, PROJECT_VISION, ARCHITECTURE, DESIGN_PRINCIPLES (16), ROADMAP, DEVELOPMENT_PROTOCOL, COLLABORATION, PROJECT_CONTEXT, CONTEXT_INJECTION

### Changed

- Session persistence moved from Sidebar component to SessionPersistence module (no React dependency)
- Exit flush guarantees no message loss on window close
- All Dashboard UI text migrated to i18n translation keys
- TypeScript strict schemas for all brain files

### Fixed

- Session auto-save race condition on window close (debounce now flushes on exit)
- Stale version numbers removed from architecture docs

### Architecture

- 8 Providers: GitProvider, TodoProvider, SessionProvider, BuildProvider, BrainProvider, ProjectInfoProvider, DesignPrinciplesProvider, ValidationProvider
- 5 Context pipeline classes: ContextBuilder, ContextSectionRegistry, BudgetAllocator, MarkdownFormatter, 8 ContextSections
- 16 Design Principles in AKB
- RuntimeManager now injects context before every adapter.run() call
