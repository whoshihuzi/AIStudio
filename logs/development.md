# Development Log

## 2026-07-01 — M13 Stabilization Sprint

### Goal
Stabilize Development Intelligence — make it trustworthy without adding new features (no Timeline, Workflow, Multi-Agent, AI reasoning).

### Tasks Completed
1. **Working Set correctness** — `WorkingSetEngine.deriveWorkingSets()` groups files by milestone via deterministic path patterns. Never merges different milestones. Backward compatible for single-milestone projects.
2. **Document Coupling refinement** — Architecture docs only required when architectural modules change. Renderer-only changes → implementation docs + changelog + logs. Each rule has explicit reason.
3. **Commit Readiness refinement** — Tri-state: `ready` | `almost_ready` | `not_ready`, with checklist items (milestone, classification, warnings, contamination). Detects incomplete tasks, unknown files, error warnings.
4. **Recommendation refinement** — Never produces vague recommendations. Examples: "Split into 2 commits: feat(…); docs: …", "Update 3 documentation file(s)", "Assign 5 orphan file(s) to a milestone".
5. **Dashboard cleanup** — `TodaysRecommendation` is now a pure renderer receiving pre-computed string. All decisions live in `DevelopmentState` before reaching widgets.

### Files Changed
17 files — engines, types, service, inspector, widgets, i18n, documentation.

### Build
- `npm run typecheck` — PASS (zero errors)
- `npm run build` — PASS (all entries built)

### Documentation
- `docs/development-intelligence-review.md` — complete M13 stabilization review
- `docs/10_CHANGELOG.md` — v0.3.1 entry added

## 2026-06-27 — Milestone 1: Project Skeleton & Governance

### Objectives
- Create the project skeleton and governance files
- Establish TypeScript configuration foundation
- Initialize Git repository with first commit

### Completed Work
- Created `package.json` with project metadata (no dependencies)
- Created `.gitignore` with Node/Electron/OS/IDE rules
- Created `.editorconfig` for cross-editor consistency
- Created `LICENSE` (MIT)
- Created `.prettierrc` (code formatting rules)
- Created `eslint.config.js` (ESLint flat config with TypeScript support)
- Created `tsconfig.json` (solution root referencing child configs)
- Created `tsconfig.node.json` (main + preload processes)
- Created `tsconfig.web.json` (renderer process, React JSX)
- Created `decisions/001_electron-as-desktop-framework.md` (first ADR)
- Created project directories: `src/main/`, `src/preload/`, `src/renderer/`, `tests/`, `plugins/`, `assets/`, `workspace/`, `prompts/`, `memory/`, `logs/`
- Initialized Git repository and created first commit

### Files Created/Modified
| File | Action |
|------|--------|
| `package.json` | Created |
| `.gitignore` | Created |
| `.editorconfig` | Created |
| `LICENSE` | Created |
| `.prettierrc` | Created |
| `eslint.config.js` | Created |
| `tsconfig.json` | Created |
| `tsconfig.node.json` | Created |
| `tsconfig.web.json` | Created |
| `decisions/001_electron-as-desktop-framework.md` | Created |
| `logs/development.md` | Created |

### Verification Results
- All files exist at expected paths
- `package.json` is valid JSON
- TypeScript configs follow project-references pattern
- No `npm install` executed (per Milestone 1 constraints)

### Git Commit
- Hash: `d88c430`
- Message: `chore: initialize project foundation`

### Notes
- Milestone 1 is intentionally dependency-free to minimize risk
- All TS configs use `strict: true` and `noUncheckedIndexedAccess: true`
- ESLint flat config prepared for TypeScript rules (will be activated when eslint/typescript-eslint are installed)
- Next milestone (M2) will introduce Electron and TypeScript compilation

### Next Milestone
Milestone 2: Electron Bare Application

---

## 2026-06-27 — Milestone 2: Electron Bare Application

### Objectives
- Install Electron and TypeScript compilation toolchain
- Create minimal main process, preload script, and static renderer
- Launch a native Electron window with no framework or styling dependencies

### Completed Work
- Installed `electron` (v42.5.0), `typescript`, `@types/node` as devDependencies
- Created `src/main/index.ts` — Electron main process with security defaults:
  - `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
  - Window: 1200x800, dark background (#1e1e1e)
- Created `src/preload/index.ts` — empty contextBridge skeleton
- Created `src/renderer/index.html` — static HTML page with CSP header
- Updated `package.json` — added `compile` and `start` scripts
- Fixed `tsconfig.node.json` — updated to `module: "Node16"`, `moduleResolution: "node16"`
- Removed `tsconfig.web.json` from root references temporarily (no TS files in renderer yet)
- Configured `ELECTRON_MIRROR` to use npmmirror.com mirror for binary download
- Verified: Electron window launches and stays running

### Files Created/Modified
| File | Action |
|------|--------|
| `src/main/index.ts` | Created |
| `src/preload/index.ts` | Created |
| `src/renderer/index.html` | Created |
| `package.json` | Modified (scripts, dependencies) |
| `tsconfig.json` | Modified (removed web reference) |
| `tsconfig.node.json` | Modified (module/moduleResolution) |
| `package-lock.json` | Created (auto-generated) |

### Installed Dependencies
| Package | Version | Type |
|---------|---------|------|
| electron | 42.5.0 | devDependency |
| typescript | (latest) | devDependency |
| @types/node | (latest) | devDependency |

### Verification Results
- `npm run compile` — TypeScript compiles successfully, zero errors
- `npm start` — Native Electron window appears with "AI Studio" title and dark background
- Process stays running while window is open (verified via process polling)
- No React code present
- No Vite configuration present

### Git Commit
- Hash: `9714700`
- Message: `feat: launch Electron bare application`

### Notes
- Electron binary download required npmmirror.com mirror due to GitHub connectivity issues
- `tsconfig.web.json` is present but temporarily excluded from project references (will be re-added in Milestone 3 when React introduces .tsx files)
- Security defaults set from day one: contextIsolation, no nodeIntegration, sandbox mode
- Window background color matches the planned dark theme (#1e1e1e)

### Next Milestone
Milestone 3: React Renderer Integration

---

## 2026-06-27 — Milestone 3: Dev Toolchain + Chat Shell + Runtime Architecture

### Objectives
- Introduce Vite + React + Tailwind as a single integrated step
- Design the Agent Runtime abstraction layer
- Build an interactive chat shell (no backend yet)

### Completed Work
- Installed react@19, react-dom@19, zustand@5, vite@7, electron-vite@5, tailwindcss@3
- Created `electron.vite.config.ts` — three-entry build (main/preload/renderer) with React plugin
- Created `tailwind.config.js` and `postcss.config.js`
- Re-activated `tsconfig.web.json` with bundler module resolution and @/ path alias
- Created `src/renderer/runtime/types.ts` — core architecture:
  - `MessagePart` discriminated union: text, code, tool, thinking
  - `Message` with role, sessionId, parts[], timestamp
  - `Session` with id, title, messages[], timestamps
  - `Workspace` with sessions[], activeSessionId
  - `AgentEvent` discriminated union: text, tool_call, tool_result, done, error
  - `IAgentRuntime` interface with `sendMessage()` and `abort()`
- Created `src/renderer/runtime/echo-runtime.ts` — stub IAgentRuntime implementation
- Created `src/renderer/stores/chat.ts` — Zustand store:
  - Manages message list, loading state, agent events
  - Dispatches messages to runtime, processes streaming events
  - Builds MessageParts from AgentEvent stream
- Created `src/renderer/components/ChatInput.tsx`:
  - Textarea with auto-resize
  - Enter to send, Shift+Enter for newline
  - Disabled state during loading
- Created `src/renderer/components/MessageList.tsx`:
  - Renders messages with role-based styling
  - PartRenderer handles text/tool parts
  - Auto-scroll to latest message
- Created `src/renderer/components/ChatView.tsx`:
  - Header with status bar (Idle / Running...)
  - Cancel button placeholder
  - Composes MessageList + ChatInput
- Created `src/renderer/styles/global.css` — Tailwind v3 directives + dark theme
- Created `src/renderer/App.tsx` and `src/renderer/main.tsx` — React entry
- Updated `src/renderer/index.html` — React mount point with module script
- Updated `src/main/index.ts` — electron-vite dev server URL loading
- Added `package.json` scripts: dev, build, preview, typecheck
- Added `"type": "module"` to package.json

### Files Created/Modified
| File | Action |
|------|--------|
| `electron.vite.config.ts` | Created |
| `postcss.config.js` | Created |
| `tailwind.config.js` | Created |
| `tsconfig.web.json` | Modified (+allowImportingTsExtensions, +paths, +noEmit) |
| `tsconfig.json` | Modified (+web reference) |
| `package.json` | Modified (scripts, type:module) |
| `src/renderer/runtime/types.ts` | Created |
| `src/renderer/runtime/echo-runtime.ts` | Created |
| `src/renderer/stores/chat.ts` | Created |
| `src/renderer/components/ChatView.tsx` | Created |
| `src/renderer/components/MessageList.tsx` | Created |
| `src/renderer/components/ChatInput.tsx` | Created |
| `src/renderer/styles/global.css` | Created |
| `src/renderer/App.tsx` | Created |
| `src/renderer/main.tsx` | Created |
| `src/renderer/env.d.ts` | Created |
| `src/renderer/index.html` | Modified (React shell) |
| `src/main/index.ts` | Modified (electron-vite dev URL) |

### Installed Dependencies
| Package | Version | Type |
|---------|---------|------|
| react | 19.2.7 | dependency |
| react-dom | 19.2.7 | dependency |
| zustand | 5.0.14 | dependency |
| electron-vite | 5.0.0 | devDependency |
| vite | 7.3.6 | devDependency |
| @vitejs/plugin-react | 5.2.0 | devDependency |
| tailwindcss | 3.x | devDependency |
| postcss | 8.5.15 | devDependency |
| autoprefixer | 10.5.2 | devDependency |
| @types/react | 19.2.17 | devDependency |
| @types/react-dom | 19.2.3 | devDependency |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 36 modules → out/main, out/preload, out/renderer
- `npm run dev` — Electron window launches with:
  - Dark-themed chat interface
  - ChatInput with auto-resize textarea
  - Enter sends message, Shift+Enter newline
  - EchoRuntime returns "Echo: <message>"
  - Messages appear in styled bubbles (user blue, assistant gray)
  - Loading state shows "Running..." with cancel button
  - HMR works: modifying source files triggers instant reload

### Git Commit
- Hash: `b02e33e`
- Message: `feat: React chat shell with Electron, Vite, Tailwind, and Agent Runtime architecture`

### Notes
- Tailwind v4 was initially installed by npm but downgraded to v3 for stability and simpler PostCSS integration
- Version conflict resolved: electron-vite@5 requires vite@^7, @vitejs/plugin-react@5 is compatible
- `IAgentRuntime` interface is the architectural boundary — UI never imports concrete implementations
- MessagePart model is forward-compatible: code/tool/thinking/image/file parts defined but not yet rendered
- EchoRuntime will be replaced by ProcessAgentRuntime in M4
- All filesystem access will go through preload bridge in M4 (Renderer currently has no filesystem access)

### Next Milestone
Milestone 4: ProcessAgentRuntime + Hermes CLI Integration (MVP)

---

## 2026-06-27 — Milestone 4: ProcessAgentRuntime Framework + Hermes Integration

### Objectives
- Deliver ProcessAgentRuntime — generic CLI agent framework
- Integrate Hermes as the first adapter (HermesAdapter)
- Implement stable IPC: agent.send / abort / onEvent
- Session persistence with JSON filesystem storage
- Full chat workflow: send → Hermes processes → response displayed
- Sidebar with session CRUD

### Completed Work
- Created `src/main/runtime/types.ts` — AgentEvent + SessionMeta + SessionData types
- Created `src/main/runtime/process-agent-runtime.ts` — abstract base class:
  - Manages spawn lifecycle, stdout/stderr parsing, abort with SIGTERM→SIGKILL escalation
  - Subclasses implement: buildCommand(), parseLine(), parseStderrLine()
- Created `src/main/runtime/hermes-adapter.ts` — thin Hermes adapter:
  - buildCommand: `hermes -z "prompt"`
  - parseLine: plain text → AgentTextEvent
  - Only 40 lines — adapter-specific code is intentionally minimal
- Created `src/main/runtime/runtime-manager.ts` — AgentRuntimeManager:
  - Adapter registry pattern (add new adapters without touching main process)
  - Main process imports ONLY RuntimeManager, never HermesAdapter directly
- Created `src/main/runtime/session-store.ts` — JSON file persistence:
  - Sessions stored in `workspace/sessions/{id}.json`
  - Index file for fast listing
  - Session meta uses extensible format: `{ runtime, adapter }` not hardcoded agent
- Updated `src/preload/index.ts` — stable IPC API:
  - `agent.send(prompt)`, `agent.abort()`, `agent.onEvent(callback)`
  - `session.create/list/load/save/delete`
  - No adapter names in API surface
- Created `src/renderer/runtime/agent-bridge.ts` — IAgentRuntime over IPC:
  - Converts IPC event stream to AsyncIterable<AgentEvent>
  - Renderer never imports HermesAdapter or any adapter-specific code
- Updated `src/renderer/stores/chat.ts` — uses AgentBridge instead of EchoRuntime
- Created `src/renderer/stores/session.ts` — session management:
  - init/create/switch/delete/saveCurrentSession
  - Auto-saves on message change
- Created `src/renderer/components/Sidebar.tsx`:
  - Session list with create/switch/delete
  - Auto-save on message change
- Created `src/renderer/components/StatusBar.tsx`:
  - Idle / Running... state display
  - Cancel button
- Updated `src/renderer/App.tsx` — Sidebar + ChatView layout
- Updated `src/renderer/components/ChatView.tsx` — uses StatusBar component
- Updated `src/renderer/env.d.ts` — full window.api type declarations
- Updated `src/main/index.ts` — ipcMain handlers for agent + session
- Updated `tailwind.config.js` — added gray-750/gray-850 for sidebar

### Files Created/Modified
| File | Action |
|------|--------|
| `src/main/runtime/types.ts` | Created |
| `src/main/runtime/process-agent-runtime.ts` | Created |
| `src/main/runtime/hermes-adapter.ts` | Created |
| `src/main/runtime/runtime-manager.ts` | Created |
| `src/main/runtime/session-store.ts` | Created |
| `src/preload/index.ts` | Modified (full IPC API) |
| `src/renderer/runtime/agent-bridge.ts` | Created |
| `src/renderer/stores/session.ts` | Created |
| `src/renderer/components/Sidebar.tsx` | Created |
| `src/renderer/components/StatusBar.tsx` | Created |
| `src/renderer/stores/chat.ts` | Modified (AgentBridge) |
| `src/renderer/App.tsx` | Modified (Sidebar layout) |
| `src/renderer/components/ChatView.tsx` | Modified (StatusBar) |
| `src/renderer/env.d.ts` | Modified (window.api types) |
| `src/main/index.ts` | Modified (ipcMain handlers) |
| `tailwind.config.js` | Modified (custom colors) |

### Architecture Verification
- Main process imports: RuntimeManager — NOT HermesAdapter ✓
- Renderer imports: AgentBridge (IAgentRuntime) — NOT HermesAdapter ✓
- Preload API surface: agent.send/abort/onEvent — no agent names ✓
- Session meta: `{ runtime: "process", adapter: "hermes" }` — extensible ✓
- Adapter registry: one-line addition for future adapters ✓

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 40 renderer + 5 main + 1 preload modules
- `npm run dev` — Electron launches with:
  - Sidebar with session list
  - Create new session → Chat clears
  - Type message → Hermes processes → response appears
  - Busy/Running state with Cancel button
  - Session persists across window restarts

### Git Commit
- Hash: `7b0c966`
- Message: `feat: ProcessAgentRuntime framework with Hermes adapter and session persistence`

### Notes
- Hermes one-shot mode (`-z`) outputs plain text only — tool calls execute server-side but are not individually streamed
- Cancel currently terminates the process (SIGTERM + 3s SIGKILL fallback)
- Session auto-save triggers on every message change via useEffect
- Node16 moduleResolution requires `.js` extensions in relative imports (main process only)
- `echo-runtime.ts` retained but no longer used — can be removed in cleanup milestone

### Next Milestone
Milestone 5: Streaming + Markdown Rendering

---

## 2026-06-27 — Milestone 5: Conversation Rendering Engine

### Objectives
- Build a Runtime-agnostic Conversation Rendering Engine
- Define the complete MessagePart model (text/code/tool/thinking/image/file)
- Implement per-part-type renderers, never per-Runtime
- Support streaming text accumulation + Markdown re-rendering

### Completed Work
- Updated `src/renderer/runtime/types.ts` — complete MessagePart model:
  - TextPart, CodePart, ToolPart, ThinkingPart, ImagePart, FilePart
  - Full AgentEvent protocol (8 event types)
  - IAgentRuntime interface unchanged
- Updated `src/main/runtime/types.ts` — synced AgentEvent types
- Updated `src/main/runtime/process-agent-runtime.ts`:
  - parseLine() returns AgentEvent[] (was AgentEvent | null)
  - parseStderrLine() returns AgentEvent[] (was AgentEvent | null)
  - stdout/stderr handlers iterate over event arrays
- Updated `src/main/runtime/hermes-adapter.ts` — adapted to array returns
- Installed `react-markdown`, `react-syntax-highlighter`, `remark-gfm`, `@types/react-syntax-highlighter`
- Created `src/renderer/components/TextRenderer.tsx`:
  - Wraps react-markdown with GitHub Flavored Markdown
  - Custom components: inline code, fenced code delegation, links, tables, blockquotes
  - Delegates fenced code blocks → CodeRenderer
- Created `src/renderer/components/CodeRenderer.tsx`:
  - Prism syntax highlighting (vscDarkPlus theme)
  - Language label in header
  - 📋 Copy button with "✓ Copied" feedback
- Created `src/renderer/components/ToolRenderer.tsx`:
  - Collapsible card, collapsed by default
  - Three states: 🔄 running (animate-pulse), ✓ done (green), ✗ error (red)
  - Expand: shows JSON input + output/error
- Created `src/renderer/components/ThinkingRenderer.tsx`:
  - Collapsible block, collapsed by default
  - 💭 header, italic content
- Created `src/renderer/components/ImageRenderer.tsx` — placeholder (📷)
- Created `src/renderer/components/FileRenderer.tsx` — placeholder (📎)
- Updated `src/renderer/components/MessageList.tsx`:
  - PartRenderer switches on part.type → dispatches to 6 renderers
  - Never references any Runtime name
- Updated `src/renderer/stores/chat.ts`:
  - Handles code/tool_call/tool_result/thinking/image/file events
  - Thinking events accumulate (like text events)

### Files Created/Modified
| File | Action |
|------|--------|
| `src/renderer/runtime/types.ts` | Modified (+ImagePart, +FilePart, +AgentEvent types) |
| `src/main/runtime/types.ts` | Modified (+AgentEvent types) |
| `src/main/runtime/process-agent-runtime.ts` | Modified (parseLine → AgentEvent[]) |
| `src/main/runtime/hermes-adapter.ts` | Modified (adapted to array) |
| `src/renderer/stores/chat.ts` | Modified (+new event handlers) |
| `src/renderer/components/MessageList.tsx` | Modified (+imports, new PartRenderer) |
| `src/renderer/components/TextRenderer.tsx` | Created |
| `src/renderer/components/CodeRenderer.tsx` | Created |
| `src/renderer/components/ToolRenderer.tsx` | Created |
| `src/renderer/components/ThinkingRenderer.tsx` | Created |
| `src/renderer/components/ImageRenderer.tsx` | Created |
| `src/renderer/components/FileRenderer.tsx` | Created |

### Installed Dependencies
| Package | Type |
|---------|------|
| react-markdown | dependency |
| react-syntax-highlighter | dependency |
| remark-gfm | dependency |
| @types/react-syntax-highlighter | devDependency |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 1109 modules, 1.9MB JS bundle
- `npm start` — Electron launches, no errors
- `npm run dev` — HMR works, chat UI functional

### Architecture Notes
- Session files now support all 6 part types natively (no migration needed)
- ImagePart/FilePart render as placeholders — fully functional when Runtime emits them
- parseLine returning AgentEvent[] enables future adapters (Claude, GPT) to emit multiple events per line
- PartRenderer dispatches by part.type only — adding new renderers is a one-line change

### Next Milestone
Milestone 6: Quality Gates (ESLint + Prettier enforcement)

---

## 2026-06-30 — M11e: Document Lifecycle Architecture Refinement (pre-implementation)

### Objectives
- Codify ownership boundaries for DocumentHandler (lifecycle only, no content)
- Codify ownership boundaries for documentBridge (transport only, no store access)
- Establish frozen architecture rules BEFORE M11e/M11f implementation

### Completed Work
- Created `DocumentHandler` (main process) with explicit prohibition against reading file content
  - Commands: `document.ensure`, `document.activate`, `document.reveal`, `document.close`
  - Lifecycle only: may use WorkspaceService.exists(), never readFile/readFileNode
  - Content loading belongs to Preview/Editor/ContentProvider layer
- Created `documentBridge` (renderer) as a transport-only pipe
  - Wraps `window.api.command.execute()` → returns `CommandResult`
  - Zero store imports: no DocumentStore, EditorStore, WorkspacePreviewStore
  - Ownership rule: `Command → CommandResult → Renderer Store` (not `Command → Bridge → Multiple Stores`)
- Added 4 document commands to `DefaultCommandRegistry`
- Wired `DocumentHandler` into `CommandExecutor` in `main/index.ts`
- Updated `architecture/15_EDITOR_ARCHITECTURE.md` — new Section 2.5 frozen rules
- Updated `architecture/15_EDITOR_ARCHITECTURE.md` — Section 11 frozen entries
- Updated `docs/editor-architecture-review.md` — Net-New Modules table

### Files Created/Modified
| File | Action |
|------|--------|
| `src/main/runtime/commands/handlers/DocumentHandler.ts` | Created |
| `src/renderer/runtime/document-bridge.ts` | Created |
| `src/main/runtime/commands/DefaultCommandRegistry.ts` | Modified (+4 document commands) |
| `src/main/index.ts` | Modified (+DocumentHandler import + 4 handler registrations) |
| `architecture/15_EDITOR_ARCHITECTURE.md` | Modified (+Section 2.5, +Section 11 entries) |
| `docs/editor-architecture-review.md` | Modified (+Net-New Modules for DocumentHandler/documentBridge) |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 38 main modules, 1133 client modules, clean

### Architecture Notes
- No milestone scope changes — these are ownership clarifications only
- DocumentHandler stubs return `{ success: false, error: "not yet implemented" }` for activate/reveal/close
- documentBridge convenience wrappers (ensureDocument, activateDocument, etc.) are pure thin wrappers
- Both modules are ready for M11e/M11f implementation with clear ownership rules

### Next Milestone
M11e: Command Palette UI

---

## 2026-06-30 — Milestone M12.6: Dashboard → Mission Control Refresh

### Objectives
- Refresh Dashboard information architecture without adding providers or IPC
- Replace Sprint-focused display with Current Milestone
- Auto-sync Project Brain from TODO.md
- Add Workspace widget from WorkspaceIndexStore
- Improve Git info with relative commit time
- Restructure Working Tree display and Recommendations

### Completed Work
- Refactored `TodoProvider` to parse milestone tasks from TODO.md (was sprint-focused)
- Created `BrainFocusSync.ts` to auto-sync brain currentFocus from TODO.md
- Updated `MilestoneProgress` type: currentMilestone, phaseLabel, milestoneTasks, lastCommitTime
- Added `getLastCommitTime()` to GitProvider
- DashboardHandler now accepts WorkspaceIndexStore for index stats
- New renderer components: `CurrentMilestone.tsx`, `TodaysRecommendation.tsx`, `WorkspaceWidget.tsx`
- Updated i18n keys (Mission Control style): Project, Workspace, Health, Recommendation
- Replaced Working Tree display: Clean/Dirty header with separate Modified/Untracked counts
- Today's Recommendation: priority-based (dirty → commit, milestone → continue, clean → ready)
- No new providers, no new IPC channels, no disk scanning

### Files Created/Modified
| File | Action |
|------|--------|
| `src/main/dashboard/BrainFocusSync.ts` | Created |
| `src/main/dashboard/types.ts` | Modified |
| `src/main/dashboard/TodoProvider.ts` | Modified |
| `src/main/dashboard/GitProvider.ts` | Modified |
| `src/main/dashboard/DashboardService.ts` | Modified |
| `src/main/dashboard/BrainProvider.ts` | Modified |
| `src/main/dashboard/ValidationProvider.ts` | Modified |
| `src/main/runtime/commands/handlers/DashboardHandler.ts` | Modified |
| `src/main/index.ts` | Modified |
| `src/renderer/env.d.ts` | Modified |
| `src/renderer/i18n/types.ts` | Modified |
| `src/renderer/i18n/en.ts` | Modified |
| `src/renderer/i18n/zh-CN.ts` | Modified |
| `src/renderer/components/Dashboard.tsx` | Modified |
| `src/renderer/components/CurrentMilestone.tsx` | Created |
| `src/renderer/components/TodaysRecommendation.tsx` | Created |
| `src/renderer/components/WorkspaceWidget.tsx` | Created |
| `src/renderer/components/IsHealthy.tsx` | Modified |
| `src/renderer/components/ProjectBrain.tsx` | Modified |
| `src/renderer/components/WhereAmI.tsx` | Deprecated (stub) |
| `src/renderer/components/WhatNext.tsx` | Deprecated (stub) |
| `docs/dashboard-acceptance-checklist.md` | Modified |
| `docs/10_CHANGELOG.md` | Modified |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 39 main modules, 1134 client modules, clean

### Architecture Notes
- No new providers added — all existing Provider responsibilities preserved
- BrainFocusSync is a pure function module, not a Provider
- WorkspaceIndexStore feeds Dashboard via DashboardHandler (no Renderer IPC for index)
- Old WhereAmI.tsx and WhatNext.tsx kept as stubs for git history

### Next Milestone
M11e: Command Palette UI

---

## 2026-06-30 — M12.7: Dashboard Information Architecture Correction

### Objectives
- Separate "Current Task" from "Milestone Progress" into two distinct widgets
- Stop ProjectBrain duplicating task ID/title
- Make Recommendation generic (never restate task title)
- Zero parser changes — pure IA correction only

### Completed Work
- Added `CurrentTask` type to types.ts, added to `ProjectState`
- `DashboardService.computeCurrentTask()` — composes from milestone + brain data
- "Current Milestone" widget renamed to "Milestone Progress" (same logic, renamed header)
- New `CurrentTask.tsx` widget — shows task ID, title, sprint, phase (no progress bar)
- `ProjectBrain.tsx` — removed milestone line, shows only sprint goal + context
- `TodaysRecommendation.tsx` — static "Continue current work." text (no `{milestone}` substitution)
- i18n: added `currentTask` + `milestoneProgress` keys, updated `continueMilestone` (en + zh-CN)
- `docs/dashboard-information-architecture.md` — responsibility matrix for every Dashboard section

### Files Created/Modified
| File | Action |
|------|--------|
| `src/main/dashboard/types.ts` | Modified |
| `src/main/dashboard/DashboardService.ts` | Modified |
| `src/renderer/components/CurrentTask.tsx` | Created |
| `src/renderer/components/CurrentMilestone.tsx` | Modified |
| `src/renderer/components/Dashboard.tsx` | Modified |
| `src/renderer/components/ProjectBrain.tsx` | Modified |
| `src/renderer/components/TodaysRecommendation.tsx` | Modified |
| `src/renderer/i18n/types.ts` | Modified |
| `src/renderer/i18n/en.ts` | Modified |
| `src/renderer/i18n/zh-CN.ts` | Modified |
| `docs/dashboard-information-architecture.md` | Created |
| `docs/10_CHANGELOG.md` | Modified |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 40 main modules, 1135 client modules, clean

### Architecture Notes
- Zero parser changes — no TodoParser, BrainFocusSync, or regex modifications
- `CurrentTask` pre-computed by DashboardService from existing milestone + brain data
- Widgets render from pre-computed data, never derive from raw fields
- File kept as `CurrentMilestone.tsx` (git-friendly rename deferred)

---

## 2026-07-01 — M13: Development Intelligence — Construction Step 1 (Domain Layer)

### Objectives
- Implement the complete Domain Layer for Development Intelligence subsystem
- Create all frozen types, interfaces, union types, and pure utilities
- Follow `architecture/16_DEVELOPMENT_INTELLIGENCE.md` Section 3 exactly
- Zero Dashboard integration, zero UI, zero Provider composition

### Completed Work
- Created `src/shared/development/types.ts` — complete frozen domain types:
  - 15 interfaces: `DevelopmentState` (top-level aggregate with 9 fields), `DevelopmentMilestone`, `DevelopmentSprint`, `WorkingSet` (8 fields with lifecycle), `WorkingSetMember`, `ChangedFile`, `RelatedDocument`, `SuggestedCommitScope`, `CommitGroup`, `DevelopmentWarning`, `CompletionEstimate`, `UncommittedRisk`
  - 7 union types: `WorkingSetPhase` (6 states: forming→active→stabilizing→review→committed→abandoned), `FileClassification` (core/support/incidental/unknown), `FileChangeType` (modified/added/deleted/renamed/untracked), `DocRelationship` (6 doc types), `WarningCategory` (7 categories), `WarningSeverity` (info/warn/error), `RiskLevel` (low/medium/high)
  - 1 pure utility: `createWorkingSetId(milestoneId: string): string` → deterministic `ws-{milestoneId}` derivation
- Zero Electron/Node.js/React imports — pure TypeScript
- Follows Shared Resource Model pattern (`src/shared/`) — accessible to Main and Renderer
- All types are JSON-serializable (no Maps, no Sets, no functions)
- Every field has explicit type annotation; no `any` type

### Files Created/Modified
| File | Action |
|------|--------|
| `src/shared/development/types.ts` | Created (210 lines, 9KB) |
| `.hermes/plans/2026-07-01_M13-domain-layer.md` | Created (plan) |
| `docs/10_CHANGELOG.md` | Modified (+M13 Domain Layer entry) |
| `logs/development.md` | Modified (this entry) |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 40 main modules, 1135+ client modules, clean
- No new npm dependencies
- No circular imports (verified: `src/shared/development/types.ts` imports nothing)
- No Electron/Node/React imports in new file

### Architecture Notes
- Domain layer is frozen per architecture Section 8 — no future changes without ADR
- `WarningSeverity` and `RiskLevel` extracted from inline unions for reuse across interfaces
- Dependency graph begins here: all future engines depend only on this file
- `DevelopmentState` is the contract boundary between Infrastructure (produces) and Presentation (consumes)
- File follows `src/shared/` conventions: `=====` header, `---` section separators, JSDoc on all exports

### Next Step
M13 Construction Step 2: `ProviderData` input type + pure logic engines (FileClassifier, DocCouplingEngine, WarningAnalyzer, CompletionAnalyzer, CommitAnalyzer, RiskAnalyzer, WorkingSetEngine)

---

## 2026-07-01 — M13 Construction Step 2: Pure Analysis Engines

### Objectives
- Implement ALL pure analysis engines as defined in `architecture/17_DEVELOPMENT_INTELLIGENCE_IMPLEMENTATION.md` Step 3–5
- Do NOT implement DevelopmentIntelligenceService
- Do NOT implement Dashboard integration or Provider access
- Every engine: pure functions only — zero state, zero IO, zero cache, zero logging

### Completed Work

Created 8 pure analysis engines in `src/main/development/`:

| File | Exported Function | Lines |
|------|------------------|-------|
| `FileClassifier.ts` | `classifyFile(path, changeType, milestoneId, brain?)` → `FileClassification` | 173 |
| `DocCouplingEngine.ts` | `findRelatedDocuments(changedPaths, workspaceRoot)` → `RelatedDocument[]` | 190 |
| `WarningAnalyzer.ts` | `analyzeWarnings(workingSet, changedFiles, relatedDocuments)` → `DevelopmentWarning[]` | 280 |
| `CompletionAnalyzer.ts` | `estimateCompletion(milestone, workingSet)` → `CompletionEstimate` | 96 |
| `CommitAnalyzer.ts` | `analyzeCommitScope(workingSet, changedFiles, relatedDocuments)` → `SuggestedCommitScope` | 256 |
| `RiskAnalyzer.ts` | `analyzeRisks(workingSet, warnings)` → `UncommittedRisk[]` | 186 |
| `WorkingSetEngine.ts` | `deriveWorkingSet(changedFiles, milestone)` → `WorkingSet` | 236 |
| `ProjectActivity.ts` | `toProjectActivity(state)` → `ProjectActivity` | 144 |

Engine details:

**FileClassifier**: Priority-based classification using milestone path patterns (M5–M13), brain architecture module mapping, support/doc path heuristics. Returns `core` | `support` | `incidental` | `unknown`.

**DocCouplingEngine**: 18 coupling rules mapping source paths to documentation (architecture docs, CHANGELOG, TODO, brain files, principles). Deduplicates by (sourcePath, docPath, relationship) tuple.

**WarningAnalyzer**: Six detection functions — contamination (multiple milestones), orphan-changes (no milestone), missing-tests (source changed, test absent), missing-docs (related doc not modified), forgotten-files (expected pairs absent), large-change (>15 files).

**CompletionAnalyzer**: Weighted formula (60% task + 40% file coverage) producing percentage 0–100 with human-readable label.

**CommitAnalyzer**: Groups files by conventional commit type (feat/fix/refactor/docs/test/chore), generates suggested commit messages with derived scope and summary. Detects orphan files and likely-forgotten files using test/doc path inference.

**RiskAnalyzer**: Maps each warning category to risk template (description, default severity, mitigation). Severity escalation for error-level warnings and large working sets. Also detects working-set-inherent risks (unknowns, incidentals, abandoned).

**WorkingSetEngine**: Composes FileClassifier to classify each changed file, detects test/doc companions, derives phase (forming→active→stabilizing→review) from classification ratios and task progress, computes commit readiness with specific blocker reasons.

**ProjectActivity**: Transforms DevelopmentState into compact Dashboard card display format with active working set summary, completion percentage, priority warning, and next action recommendation.

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 40 main modules, 1135+ client modules, clean
- No new npm dependencies
- Zero circular dependencies (WorkingSetEngine → FileClassifier only)
- All engines are pure functions: no classes, no state, no IO, no providers

### Architecture Notes
- All engines depend only on `src/shared/development/types.ts`
- FileClassifier additionally reads `BrainArchitecture` from `src/main/dashboard/types.ts` (type-only import)
- ModuleResolution requires `.js` extensions on all relative imports (Node16)
- DevelopmentIntelligenceService intentionally NOT implemented — deferred to Construction Step 3
- All engines are independently testable with mock data
- Follows architecture Section 1.3 pure logic module contract exactly

### Next Step
M13 Construction Step 3: DevelopmentIntelligenceService composition hub + ProviderData input type

---

## 2026-07-01 — M13 Construction Step 3: DevelopmentIntelligenceService

### Objectives
- Implement DevelopmentIntelligenceService — pure composition hub
- Create ProviderData input contract
- Wire into DashboardService (optional composition, graceful degradation)

### Completed Work
- Created `src/main/development/types.ts` — `ProviderData` interface (workingTree, milestone, brain)
- Created `src/main/development/DevelopmentIntelligenceService.ts` — `computeState(input) → DevelopmentState`
  - Pure composition: zero business logic, zero IO, zero state, zero cache
  - Parses milestone/sprint identity from MilestoneProgress + BrainData
  - Derives ChangedFile[] from raw Git status strings (WorkingTree.files)
  - Delegates to all 6 pure engines in order: WorkingSetEngine → DocCouplingEngine → WarningAnalyzer → CompletionAnalyzer → CommitAnalyzer → RiskAnalyzer
  - Assembles complete DevelopmentState with all 9 fields
- Added `developmentState?: DevelopmentState` optional field to `ProjectState`
- Integrated into `DashboardService.computeDevelopmentState()` with try/catch graceful degradation
- Service receives workspaceRoot via constructor (configuration, not IO)
- DevelopmentIntelligenceService never calls GitProvider, TodoProvider, or BrainProvider directly

### Files Created/Modified
| File | Action |
|------|--------|
| `src/main/development/types.ts` | Created |
| `src/main/development/DevelopmentIntelligenceService.ts` | Created |
| `src/main/dashboard/types.ts` | Modified (added import + developmentState field) |
| `src/main/dashboard/DashboardService.ts` | Modified (imports + devIntel instance + computeDevelopmentState) |
| `docs/10_CHANGELOG.md` | Updated |
| `logs/development.md` | Updated |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 49 main modules (up from 40), 120 kB main, clean
- No new npm dependencies
- Zero breaking changes to existing IPC, handlers, renderer, or widgets
- All new modules follow Node16 module resolution (.js extensions)

### Architecture Notes
- Dependency graph strictly downward: Domain (shared types) → Infrastructure (engines → service) → DashboardService
- No cycles: providers never import development/, renderer never imports development/
- DashboardService remains the sole integrator
- DevelopmentState is always complete (arrays may be empty, but no field is null)
- Handles all-null provider data gracefully with sensible defaults (id="—", phase=0, etc.)
- DocCouplingEngine workspaceRoot is configuration string, not filesystem IO

---

## 2026-07-01 — Milestone 13 Construction Step 4: DevelopmentState Verification

### Objectives
- Document every field of DevelopmentState with source, engine, meaning, and consumer
- Create a DevelopmentState inspector utility (code-callable, not UI)
- Cross-validate all fields: no duplicates, no missing, no impossible, no contradictory state
- Declare DevelopmentState stable for Dashboard integration

### Completed Work
- Created `docs/development-state-validation.md` — complete field-level audit:
  - All 9 DevelopmentState fields documented with sub-field tables
  - Composition pipeline diagram showing data flow through all engines
  - Cross-validation matrix: 4 categories × multiple checks each
  - 8 edge cases verified (all-null, clean tree, untracked, single-unknown, mixed-milestones, complete, large-WS, missing-tests)
  - Dashboard integration readiness declaration
  - Stability declaration
- Created `src/main/development/DevelopmentStateInspector.ts` — development utility:
  - `formatDevelopmentState(state)` — pure formatter returning formatted ASCII string
  - `inspectFromProviderData(input)` — accepts ProviderData, computes via service, formats
  - `inspectDevelopmentState(input)` — overloaded: accepts DevelopmentState or ProviderData
  - Built-in cross-validation section with 7 assertions
  - Boxed ASCII output format with all 9 sections
- Verified: zero Dashboard changes, zero Renderer changes, zero Widget changes

### Files Created/Modified
| File | Action |
|------|--------|
| `docs/development-state-validation.md` | Created |
| `src/main/development/DevelopmentStateInspector.ts` | Created |
| `docs/10_CHANGELOG.md` | Updated |
| `logs/development.md` | Updated |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — successful (120 kB main, clean)
- No Dashboard changes, no Renderer changes, no Widget changes
- All new modules follow Node16 module resolution (.js extensions)
- DevelopmentStateInspector is pure — zero side effects, no mutation, no IO

### Architecture Notes
- Inspector lives in Infrastructure layer — same directory as other engines
- Inspector depends on DevelopmentIntelligenceService (for ProviderData path) and shared types
- No new dependencies — all imports from within development/ module or shared/
- Inspector is NOT registered as a DI service — it's a standalone utility function
- DevelopmentState is now FROZEN and STABLE — Dashboard integration may proceed with zero additional business logic

---

## 2026-07-01 — M13 Construction Step 5: Dashboard Integration

### Objectives
- Refactor Dashboard widgets to consume DevelopmentState where appropriate
- Ensure Dashboard contains zero business logic
- Verify every interpretation originates inside DevelopmentState
- Create acceptance document for Development Intelligence

### Completed Work

**Widget Refactoring:**

| Widget | Before | After |
|--------|--------|-------|
| IsHealthy | `ProjectState.status` (workingTree + build) | `DevelopmentState` (completion, warnings, commit readiness, risks) |
| TodaysRecommendation | `ProjectState.status.recommendationType` | `DevelopmentState.workingSet.phase` → phase-based recommendation |
| RecentActivity | `ProjectState.recent` (commits + sessions) | `DevelopmentState.changedFiles` + `relatedDocuments` |

**i18n:**

- Added 21 new i18n keys under `dashboard.*` for Development Intelligence display
- English (`en.ts`) and zh-CN (`zh-CN.ts`) translations complete
- Types updated in `types.ts`

**Acceptance Document:**

- Created `docs/development-intelligence-acceptance.md` — verifies all 6 architecture phases

### Files Created/Modified
| File | Action |
|------|--------|
| `src/renderer/components/IsHealthy.tsx` | Rewritten |
| `src/renderer/components/TodaysRecommendation.tsx` | Rewritten |
| `src/renderer/components/RecentActivity.tsx` | Rewritten |
| `src/renderer/components/Dashboard.tsx` | Modified |
| `src/renderer/i18n/types.ts` | Modified |
| `src/renderer/i18n/en.ts` | Modified |
| `src/renderer/i18n/zh-CN.ts` | Modified |
| `docs/10_CHANGELOG.md` | Updated |
| `docs/development-intelligence-acceptance.md` | Created |
| `logs/development.md` | Updated |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 49 main modules, 1135 client modules, clean
- Dashboard contains zero business logic — all values read directly from DevelopmentState
- No widget calls any engine, derives warnings, derives completion, or derives commit readiness
- Graceful degradation: widgets show "not yet available" when developmentState is undefined

### Architecture Notes
- Development Intelligence (M13) is now COMPLETE
- Future consumers: Dashboard (complete), AI Runtime, Command Palette, Workflow Engine, Session
- Zero technical debt — all engines are pure, all types are frozen, all layers isolated
- Dashboard is now a pure presentation layer for both ProjectState and DevelopmentState

---

## 2026-07-01 — M12 Code Manipulation Foundation

### Objectives
- Establish write audit trail recording every disk mutation through the single write gate
- Implement pure diff computation (LCS-based line diff)
- Wire editor.open / editor.save / editor.diff commands through EditorHandler
- Replace "Editor not implemented" placeholder with working textarea editor

### Completed Work

**Write Audit:**
- `src/shared/editor/audit.ts` — `WriteAuditEntry`, `WriteOperation` shared types
- `src/main/workspace/WriteAuditTrail.ts` — in-memory circular buffer (1000 entries), queries: `recent()`, `since()`, `forPath()`
- Integrated into `WorkspaceProvider` single write gate: `writeFile`, `mkdir`, `delete`, `copy` record audit entries
- Exposed via `WorkspaceService.getAuditTrail()`

**Diff Computation:**
- `src/shared/editor/diff.ts` — `DiffHunk`, `DiffLine`, `DiffResult` shared types
- `src/main/editor/DiffComputer.ts` — pure LCS-based line diff; `computeDiff(old, new)` returns `DiffHunk[]`; `computeFileDiff(path, old, new)` returns `DiffResult`

**Editor Commands:**
- `src/main/runtime/commands/handlers/EditorHandler.ts` — handles `editor.open` (read FileNode + content from disk), `editor.save` (write through WorkspaceService single gate), `editor.diff` (compute diff against disk version)
- Registered 4 editor commands in `DefaultCommandRegistry`: `editor.open`, `editor.save`, `editor.diff`, `editor.apply-patch` (skeleton)
- Wired EditorHandler in `main/index.ts` with 3 handler registrations

**Editor UI:**
- EditorPanel replaced "Editor not implemented" with functional textarea
- EditorToolbar: working Save/Saved button with dirty indicator (● yellow dot)
- Ctrl+S / Cmd+S keyboard shortcut wired in EditorPanel
- EditorStore extended with `currentContent`, `originalContent`, `dirty`, `saving`, `saveError` state
- Content loading: `documentBridge("editor.open")` → IPC → EditorHandler → WorkspaceService.readFileNode
- Content saving: `documentBridge("editor.save")` → IPC → EditorHandler → WorkspaceService.writeFile (single write gate + audit)

**Command System:**
- `CommandContext` extended with `args?: Record<string, unknown>`
- `ipcMain.handle("command:execute")` passes raw args through to handlers

### Files Created/Modified

| File | Action |
|------|--------|
| `src/shared/editor/audit.ts` | Create — WriteAuditEntry + WriteOperation types |
| `src/shared/editor/diff.ts` | Create — DiffHunk, DiffLine, DiffResult types |
| `src/main/workspace/WriteAuditTrail.ts` | Create — In-memory audit trail |
| `src/main/editor/DiffComputer.ts` | Create — Pure LCS diff function |
| `src/main/runtime/commands/handlers/EditorHandler.ts` | Create — editor.open/save/diff |
| `src/main/workspace/WorkspaceProvider.ts` | Modify — Inject WriteAuditTrail, record on write/delete/mkdir/copy |
| `src/main/workspace/WorkspaceService.ts` | Modify — Own WriteAuditTrail, expose getAuditTrail() |
| `src/main/runtime/commands/DefaultCommandRegistry.ts` | Modify — Add 4 editor commands |
| `src/main/index.ts` | Modify — Import + register EditorHandler, pass args through |
| `src/shared/command/types.ts` | Modify — Add args to CommandContext |
| `src/renderer/stores/editor.ts` | Rewrite — Content/save/dirty state + save flow |
| `src/renderer/components/editor/EditorPanel.tsx` | Rewrite — Textarea editor + Ctrl+S |
| `src/renderer/components/editor/EditorToolbar.tsx` | Rewrite — Working Save button + dirty indicator |
| `docs/09_TODO.md` | Modify — M12 and M13 marked complete |
| `docs/10_CHANGELOG.md` | Modify — M12 entry |
| `logs/development.md` | Modify — M12 entry |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 54 main modules (+5), 1139 client modules, clean
- Write audit: records on writeFile (create/update), mkdir (create), delete (delete), copy (create)
- Diff computation: pure function, zero IO, LCS O(n*m), works on any two strings
- Editor save flow: Renderer → documentBridge → IPC → EditorHandler → WorkspaceService → WorkspaceProvider (single write gate + audit)
- Architecture: zero layer violations — EditorHandler never touches DocumentStore, EditorStore never touches WorkspaceProvider

### Architecture Notes
- Code Manipulation Foundation (M12) is now COMPLETE
- Write audit trail records every disk mutation — ready for change tracking, undo, and external change detection
- DiffComputer is pure and reusable — can be called by AI agents via editor.diff command, by future patch application, by workspace change detection
- Editor UI is functional: open file → see content in textarea → edit → Save → written through single write gate with audit
- Out of scope for M13+: undo/redo, external change detection, auto-save, patch application, Monaco/CodeMirror

---

## 2026-07-01 — Sprint 5: Diff View + Accept/Reject + Patch Application

### Objectives
- Implement Diff View — render DiffHunk[] as a unified diff with colored lines
- Implement Accept/Reject — per-hunk and full-file accept/reject operations
- Implement Patch Application — parse and apply unified diff patches

### Completed Work
- Created `src/renderer/components/editor/DiffView.tsx` — Pure component rendering DiffResult as unified diff with:
  - Color-coded lines (green=added, red=removed, gray=context)
  - Line number columns (old/new)
  - Hunk headers with @@ -l,s +l,s @@ format
  - Interactive mode: Accept/Reject buttons per hunk + Accept All/Reject All
- Extended `EditorStore` with diff state (diffResult, diffVisible, diffError, processingHunks) and actions:
  - `diff()` — calls editor.diff command, stores result, shows diff view
  - `hideDiff()` — returns to editor textarea
  - `acceptHunk(hunkIndex)` — applies hunk changes to currentContent, removes from diff
  - `rejectHunk(hunkIndex)` — reverts hunk changes, removes from diff
  - `acceptAll()` — applies all hunks, closes diff
  - `rejectAll()` — reverts to originalContent, closes diff
  - `applyPatch(patch)` — calls editor.apply-patch command
- Added `applyHunk()` pure helper function — reconstructs content by applying/rejecting DiffHunk lines
- Updated `EditorPanel.tsx` — toggles between textarea (edit mode) and DiffView (diff mode)
- Updated `EditorToolbar.tsx` — added Diff/Edit toggle button
- Extended `EditorHandler` with `editor.apply-patch` handler + `applyUnifiedPatch()` pure function:
  - Parses unified diff format (@@ -l,s +l,s @@)
  - Validates and applies line changes
  - Returns new content without writing to disk
- Wired `editor.apply-patch` handler in `main/index.ts`

### Files Created
| File | Description |
|------|-------------|
| `src/renderer/components/editor/DiffView.tsx` | Unified diff renderer with accept/reject UI |

### Files Modified
| File | Description |
|------|-------------|
| `src/renderer/stores/editor.ts` | Added diff state, accept/reject, applyPatch + applyHunk helper |
| `src/renderer/components/editor/EditorPanel.tsx` | Diff/edit view toggle integration |
| `src/renderer/components/editor/EditorToolbar.tsx` | Added Diff/Edit toggle button |
| `src/main/runtime/commands/handlers/EditorHandler.ts` | Added editor.apply-patch handler + unified patch parser |
| `src/main/index.ts` | Wired editor.apply-patch handler |
| `docs/09_TODO.md` | Marked Sprint 5 items complete |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 54 main modules, 1140 client modules, clean
- Architecture: zero layer violations — DiffView is pure presentational, EditorStore owns all diff state, EditorHandler is the single IPC gateway

## 2026-07-01 — Code Hygiene: Dead Code Removal + Agent Agnosticism

### Objectives
- Remove dead stub code leftover from Phase 1
- Eliminate hardcoded `"hermes"` adapter names from renderer and main process
- Clean up stale M11d.2-era comments

### Completed Work
- **Deleted** `src/renderer/runtime/echo-runtime.ts` — Phase 1 EchoRuntime stub (29 lines), zero references since M4 introduced ProcessAgentRuntime
- **Fixed renderer hardcoding:** `src/renderer/stores/session.ts:56` — `session.create("hermes")` → `session.create()` (no adapter name in renderer)
- **Fixed preload API:** `src/preload/index.ts:62` — `create(adapter)` → `create(adapter?)` (adapter is optional)
- **Fixed type declaration:** `src/renderer/env.d.ts:262` — `create: (adapter?: string)` (matches preload contract)
- **Fixed main process hardcoding (agent:send):** `src/main/index.ts:142` — hardcoded `"hermes"` → `runtimeManager.listAdapters()[0]?.id ?? "hermes"`
- **Fixed main process hardcoding (session:create):** `src/main/index.ts:163` — handler defaults to first available adapter when none provided
- **Fixed SessionHandler:** `src/main/runtime/commands/handlers/SessionHandler.ts:29` — meaningless ternary `x ? "hermes" : "hermes"` → `runtimeManager.listAdapters()[0]?.id ?? "hermes"`
- **Cleaned DefaultCommandRegistry:** removed stale M11d.2 "metadata only — no implementations" comments; updated `editor.apply-patch` description from "(skeleton)" to actual capability

### Files Changed
| File | Action |
|------|--------|
| `src/renderer/runtime/echo-runtime.ts` | Deleted |
| `src/renderer/stores/session.ts` | Modify — remove hardcoded adapter name |
| `src/preload/index.ts` | Modify — adapter param made optional |
| `src/renderer/env.d.ts` | Modify — adapter param made optional in type |
| `src/main/index.ts` | Modify — resolve default adapter dynamically |
| `src/main/runtime/commands/handlers/SessionHandler.ts` | Modify — import runtimeManager, resolve default |
| `src/main/runtime/commands/DefaultCommandRegistry.ts` | Modify — stale comments updated |
| `docs/10_CHANGELOG.md` | Modify — Code Hygiene entry |
| `logs/development.md` | Modify — this entry |

### Verification Results
- `npm run typecheck` — zero errors
- `npm run build` — 54 main modules, 1140 client modules, clean
- Agent agnosticism improved: renderer no longer references any concrete adapter name
- Architecture: zero new layer violations — SessionHandler imports runtimeManager (Infrastructure → Infrastructure, same layer)
