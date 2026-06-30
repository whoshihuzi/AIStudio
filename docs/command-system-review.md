# M11c.5 — Command System Architecture Verification

**Date**: 2026-06-30  
**Status**: Architecture Frozen at M11c; this is the verification gate before M11d implementation.  
**Scope**: Documentation only. No code changes. No runtime changes. No IPC changes.

---

## 1. Full Action Audit — Can Every Existing User Action Become a Command?

Below, every identifiable user action is traced from its current implementation path to its future Command path. Each entry answers three questions: *What happens today?*, *How would this be a Command?*, and *What is the migration risk?*

### 1.1 Open Dashboard

| Aspect | Detail |
|---|---|
| **Current Flow** | `Sidebar` calls `onNavigate("dashboard")` → `App` `setView("dashboard")` → `<Dashboard />` mounts → `useEffect` fires `refresh()`. No IPC involved; pure React state. |
| **Future Command** | `navigation.open-dashboard` — `execute()` sets `currentView` to `"dashboard"` + triggers `dashboard.refresh`. Invocable via Ctrl+Shift+D, Command Palette, or AI. |
| **Migration Risk** | **Low**. `App.tsx` already centralises view routing. Replace inline `setView` with a `registry.execute("navigation.open-dashboard", context)`. The `Sidebar` button becomes a Command invocation, not a direct state call. |

### 1.2 Open Session

| Aspect | Detail |
|---|---|
| **Current Flow** | `Sidebar.handleSessionClick(id)` → `switchSession(id)` (Zustand) + `onNavigate("chat")`. Session list is populated by `useSessionStore.init()` via `session:list` IPC. |
| **Future Command** | `session.open` — `execute(context)` where `context.activeSessionId` identifies the session. The executor resolves the session, switches to `"chat"` view, and loads message history. |
| **Migration Risk** | **Low**. Session store already exposes `switchSession`. The Command wraps the store call. `Sidebar` session list items become Command triggers. |

### 1.3 Open Workspace File

| Aspect | Detail |
|---|---|
| **Current Flow** | `WorkspaceTreeNode` double-click → `useWorkspacePreviewStore.open(path)` → `window.api.workspace.read(path)` IPC → Main `workspaceService.readFileNode(path)` → returned to Renderer → `PreviewPanel` renders. |
| **Future Command** | `workspace.open-file` — `execute(context)` with `context.selectedFile`. Executor resolves the file via `WorkspaceService`, opens PreviewPanel, sets `currentView` context. |
| **Migration Risk** | **Low-Medium**. The PreviewPanel is currently managed via Zustand. The Command executor must be able to set the preview store state — this may require a thin bridge from Main to Renderer store, or the Command could be executed in Renderer context. See Section 3 for architecture resolution. |

### 1.4 Refresh Dashboard

| Aspect | Detail |
|---|---|
| **Current Flow** | `DashboardHeader` refresh button → `useDashboardStore.refresh()` → `window.api.dashboard.getData()` IPC → `dashboardService.getData()`. |
| **Future Command** | `dashboard.refresh` — `execute()` triggers `dashboardService.getData()` and pushes result to Renderer. Keyboard shortcut: F5 or Ctrl+R when on Dashboard. |
| **Migration Risk** | **Low**. Dashboard refresh is already a distinct action. Wrapping it as a Command is a one-line change from `refresh()` to `registry.execute("dashboard.refresh", ctx)`. |

### 1.5 Rebuild Workspace Index

| Aspect | Detail |
|---|---|
| **Current Flow** | No UI trigger exists yet. `WorkspaceIndexStore.rebuild()` is called programmatically from Main. IPC channel `workspace:index:rebuild` exists but is not wired to any button. |
| **Future Command** | `workspace.rebuild-index` — `execute()` calls `workspaceIndexStore.rebuild()` in Main, returns stats to Renderer. Invocable from Command Palette, or triggered automatically on workspace open. |
| **Migration Risk** | **Low**. The IPC channel already exists. Adding a Command that invokes it is trivial. No UI migration needed — this is a new action. |

### 1.6 Run Build Checks

| Aspect | Detail |
|---|---|
| **Current Flow** | `IsHealthy` component shows "Run checks" button → `useDashboardStore.refreshBuild()` → `window.api.dashboard.runChecks()` IPC → `dashboardService.runChecks()`. |
| **Future Command** | `dashboard.run-checks` — `execute()` invokes `dashboardService.runChecks()`. Keyboard shortcut: Ctrl+Shift+B. |
| **Migration Risk** | **Low**. The button already triggers a single store action. Replace with Command invocation. |

### 1.7 Refresh Project Brain

| Aspect | Detail |
|---|---|
| **Current Flow** | Project Brain is loaded as part of `DashboardService.getData()` via `BrainProvider.getBrainData()`. No independent refresh button exists. Brain files (`workspace/brain/*.json`) are read at Dashboard mount time. |
| **Future Command** | `brain.refresh` — `execute()` re-reads brain JSON files and pushes updated data to Renderer. Invocable after manually editing brain files. |
| **Migration Risk** | **Low**. `BrainProvider` already supports re-reading. The Command simply triggers a fresh read. No existing button to migrate. |

### 1.8 Change Language

| Aspect | Detail |
|---|---|
| **Current Flow** | Native menu `Settings > Language > English/简体中文` → `setLanguage()` in Main → `configStore.setConfig("language", locale)` → `mainWindow.webContents.send("config:language-changed", locale)` → `LanguageProvider` receives event → `setLocaleState(locale)`. Also configurable via `LanguageProvider.setLocale()`. |
| **Future Command** | `settings.set-language` — `execute(context)` where payload is `{locale: "en" | "zh-CN"}`. Invocable via Ctrl+Shift+L or Command Palette `> Change Language`. |
| **Migration Risk** | **Low**. The native menu item and the React context both converge to `configStore.setConfig`. The Command executor simply calls the same path. Menu items become Command triggers. |

### 1.9 Open Preview

| Aspect | Detail |
|---|---|
| **Current Flow** | `useWorkspacePreviewStore.open(path)` → sets `visible = true`, loads file. The PreviewPanel is conditionally rendered in `App.tsx` based on `previewVisible`. |
| **Future Command** | Internal — `workspace.open-file` implicitly opens preview. A standalone `workspace.open-preview` could open an empty preview panel. |
| **Migration Risk** | **Low**. Preview visibility is already a Zustand boolean. The Command sets it. |

### 1.10 Close Preview

| Aspect | Detail |
|---|---|
| **Current Flow** | PreviewPanel close button (✕) → `useWorkspacePreviewStore.close()` → sets `visible = false`, clears file data. |
| **Future Command** | `workspace.close-preview` — `execute()` sets preview store to closed. Keyboard shortcut: Escape. |
| **Migration Risk** | **Low**. Single store call to wrap. |

### 1.11 Summary — Action Coverage

| # | Action | Command ID | Migration Risk |
|---|---|---|---|
| 1 | Open Dashboard | `navigation.open-dashboard` | Low |
| 2 | Open Session | `session.open` | Low |
| 3 | Open Workspace File | `workspace.open-file` | Low-Medium |
| 4 | Refresh Dashboard | `dashboard.refresh` | Low |
| 5 | Rebuild Workspace Index | `workspace.rebuild-index` | Low |
| 6 | Run Build Checks | `dashboard.run-checks` | Low |
| 7 | Refresh Project Brain | `brain.refresh` | Low |
| 8 | Change Language | `settings.set-language` | Low |
| 9 | Open Preview | `workspace.open-preview` | Low |
| 10 | Close Preview | `workspace.close-preview` | Low |

**Verdict**: Every existing user action can become a Command with **low migration risk**. The only item with "Low-Medium" risk (`workspace.open-file`) is due to the Renderer/Main boundary for PreviewPanel state — resolved in Section 3 below.

---

## 2. Module Audit — Command System Responsibility Matrix

Each module is classified into one of four roles:

| Role | Meaning |
|---|---|
| **Consume** | Invokes commands via `registry.execute()` — fires them off. |
| **Register** | Calls `registry.register(cmd)` to add commands to the system. |
| **Execute** | Contains the actual logic that runs when a command fires. |
| **Ignore** | Has no interaction with the Command System. |

### 2.1 WorkspaceProvider (`src/main/workspace/WorkspaceProvider.ts`)

| Decision | **Execute Commands** |
|---|---|
| **Rationale** | `WorkspaceProvider` is a pure filesystem abstraction. Commands like `workspace.open-file`, `workspace.rebuild-index` need to call its methods (`readFile`, `listDirectory`). The provider itself does not register or consume — it is called *by* the executor. |
| **Example** | `workspace.open-file` executor: `const content = workspaceService.readFileNode(path);` |

### 2.2 WorkspaceIndexStore (`src/main/workspace/WorkspaceIndexStore.ts`)

| Decision | **Execute Commands** |
|---|---|
| **Rationale** | In-memory index. `workspace.rebuild-index` executor calls `indexStore.rebuild()`. The store does not register or consume commands — it is data, not control flow. |
| **Example** | `workspace.rebuild-index` executor: `const stats = workspaceIndexStore.rebuild(); return stats;` |

### 2.3 SearchProvider (`src/main/workspace/SearchProvider.ts`)

| Decision | **Execute Commands** |
|---|---|
| **Rationale** | Produces search results from indexed entries. Future commands like `workspace.search`, `workspace.quick-open` will call `searchProvider.findBySubstring(query)`. The provider doesn't register its own commands — the executor invokes it. |
| **Note** | SearchProvider could also **Register** a `workspace.search` command that wraps its own API, but per architecture, registration should happen at a higher orchestration layer (the Main process bootstrap), not inside domain services. |

### 2.4 DashboardService (`src/main/dashboard/DashboardService.ts`)

| Decision | **Execute Commands** |
|---|---|
| **Rationale** | Single entry point for Dashboard data. Commands `dashboard.refresh`, `dashboard.run-checks`, `brain.refresh` all route through `DashboardService`. The service does not register commands — it is invoked by the executor. |
| **Example** | `dashboard.refresh` executor: `const data = await dashboardService.getData();` |

### 2.5 BrainProvider (`src/main/dashboard/BrainProvider.ts`)

| Decision | **Execute Commands** |
|---|---|
| **Rationale** | Reads brain JSON files. `brain.refresh` executor calls `brainProvider.getBrainData()`. `BrainProvider` is infrastructure — it serves data to the executor. |

### 2.6 ContextBuilder (`src/main/context/ContextBuilder.ts`)

| Decision | **Execute Commands** |
|---|---|
| **Rationale** | Orchestrates context injection pipeline. A future `context.rebuild` or `context.preview` command would invoke `contextBuilder.build(request)`. The builder does not register or consume — it is a domain service. |

### 2.7 RuntimeManager (`src/main/runtime/runtime-manager.ts`)

| Decision | **Consume Commands + Execute Commands** |
|---|---|
| **Rationale** | **Dual role**. The RuntimeManager is both: (1) it **executes** `agent.send` and `agent.abort` commands — it owns the agent lifecycle; (2) it **consumes** tool-command mappings — when an AI agent invokes a tool, that tool maps to a Command. Tool-calling goes through `registry.execute(toolCommandId, ctx)`. |
| **Example (Execute)** | `agent.send` executor: `await runtimeManager.run(adapter, prompt, state, onEvent);` |
| **Example (Consume)** | AI says "open file X" → tool call resolves to `workspace.open-file` → `registry.execute("workspace.open-file", ctx)`. |

### 2.8 HermesAdapter (`src/main/runtime/hermes-adapter.ts`)

| Decision | **Ignore Commands** |
|---|---|
| **Rationale** | The adapter is a thin CLI protocol translator (`buildCommand` + `parseLine`). It has no knowledge of the application's feature set. Commands are a higher-level abstraction. The adapter sees only `spawn(hermes, args)` and stdout lines. Making it command-aware would violate layer isolation. |

### 2.9 Sidebar (`src/renderer/components/Sidebar.tsx`)

| Decision | **Consume Commands** |
|---|---|
| **Rationale** | Sidebar buttons become Command invocations. "Dashboard" button → `registry.execute("navigation.open-dashboard", ctx)`. Session list items → `registry.execute("session.open", ctx)`. The Sidebar never registers or executes — it's pure Presentation. |
| **Example** | `<button onClick={() => registry.execute("navigation.open-dashboard", ctx)}>` |

### 2.10 PreviewPanel (`src/renderer/components/PreviewPanel.tsx`)

| Decision | **Consume Commands** |
|---|---|
| **Rationale** | Close button → `registry.execute("workspace.close-preview", ctx)`. Refresh button → `registry.execute("workspace.refresh-preview", ctx)`. The panel triggers commands; it does not register or execute them. |

### 2.11 LanguageProvider (`src/renderer/i18n/LanguageProvider.tsx`)

| Decision | **Consume Commands** |
|---|---|
| **Rationale** | Language change can be triggered by Command (`settings.set-language`). The provider's `setLocale` method is called by the Command executor. The provider itself does not register commands — it is consumed by the executor. |

### 2.12 Summary — Module Responsibility Matrix

| Module | Role | Justification |
|---|---|---|
| WorkspaceProvider | Execute | Filesystem abstraction — called by executors |
| WorkspaceIndexStore | Execute | In-memory index — called by executors |
| SearchProvider | Execute | Search logic — called by executors |
| DashboardService | Execute | Data aggregation — called by executors |
| BrainProvider | Execute | Brain file reader — called by executors |
| ContextBuilder | Execute | Context pipeline — called by executors |
| RuntimeManager | Consume + Execute | Agent lifecycle (execute) + tool→command mapping (consume) |
| HermesAdapter | Ignore | Protocol translator — no application-layer knowledge |
| Sidebar | Consume | UI triggers commands |
| PreviewPanel | Consume | UI triggers commands |
| LanguageProvider | Consume | React context consumed by executor |

---

## 3. Dependency Matrix — Cycle Detection

The Command System introduces two new modules: **Registry** and **Executor**. Below we validate that no future cycle exists.

### 3.1 Module Dependency Graph (Post-M11d)

```
Registry ─────────────────────────────────────────────┐
  │  (owns CommandDefinition[])                       │
  │  find() / register() / unregister()               │
  │                                                    │
  ▼                                                    │
Executor ────────────────────────────────────────────┐│
  │  (dispatches to execution targets)               ││
  │  execute("workspace.open-file", ctx)             ││
  │                                                    ││
  ├──► WorkspaceService.readFileNode()                ││
  ├──► DashboardService.getData()                     ││
  ├──► WorkspaceIndexStore.rebuild()                  ││
  ├──► BrainProvider.getBrainData()                   ││
  ├──► SearchProvider.findBySubstring()               ││
  ├──► ContextBuilder.build()                         ││
  ├──► RuntimeManager.run() / abort() / runTool()     ││
  └──► configStore.setConfig()                        ││
                                                       ││
Renderer (Sidebar / Dashboard / PreviewPanel) ────────┘│
  │  (consumes commands via Registry.execute())        │
  │  Never calls Executor directly.                    │
  │  Never calls Main modules directly.                │
  │                                                     │
  └──► IPC ──► Main process (executor lives here)      │
```

### 3.2 Dependency Matrix

| From ↓ / To → | Registry | Executor | Workspace | Runtime | Dashboard | Renderer |
|---|---|---|---|---|---|---|
| **Registry** | — | ✅ registers cmds | ❌ | ❌ | ❌ | ❌ |
| **Executor** | ✅ reads defs | — | ✅ calls WS | ✅ calls RM | ✅ calls DS | ❌ |
| **Workspace** | ❌ | ❌ | — | ❌ | ❌ | ❌ |
| **Runtime** | ✅ Consume | ❌ | ❌ | — | ❌ | ❌ |
| **Dashboard** | ❌ | ❌ | ❌ | ❌ | — | ❌ |
| **Renderer** | ✅ Consume | ❌ | ❌ | ❌ | ❌ | — |

**Key**: ✅ = depends on; ❌ = no dependency; — = self.

### 3.3 Cycle Analysis

| Potential Cycle | Exists? | Why Not |
|---|---|---|
| Registry → Executor → Registry | **No** | Executor *reads* Registry (looks up `CommandDefinition`) but never *writes* to it. Registry never calls Executor. |
| Registry → Renderer → Registry | **No** | Renderer consumes via `Registry.execute()`. Registry does not depend on Renderer. |
| Executor → Workspace → Executor | **No** | Workspace (and all domain services) have no knowledge of Executor. Pure downstream dependency. |
| Runtime → Executor → Runtime | **No** | Runtime consumes `Registry.execute()` for tool calls. Executor calls `RuntimeManager.run()` for agent commands. Appears bidirectional but is **not a cycle**: Runtime consumes Registry (not Executor), and Executor calls RuntimeManager directly (not through Registry). Two distinct call paths. |

### 3.4 The PreviewPanel State Question (from Section 1.3)

**Concern**: If `workspace.open-file` executor lives in Main process, how does it set PreviewPanel state in Renderer?

**Resolution**: Two valid approaches, neither creates a cycle:

1. **Main Executor + IPC push**: Executor runs `workspaceService.readFileNode(path)` in Main, pushes result to Renderer via `mainWindow.webContents.send("command:result", payload)`. Renderer's CommandResult handler updates Zustand store. This is the existing pattern (`agent:event` push).

2. **Renderer-side executor proxy**: The `execute()` call in Renderer goes through IPC to Main, runs the logic, returns result. This is the existing pattern (`ipcRenderer.invoke`).

Both are compatible with the frozen architecture. The decision is deferred to M11d implementation design, not this verification.

### 3.5 Verdict

**No cycles exist.** The dependency graph is a clean DAG. Registry and Executor sit between Presentation and Domain without creating backward edges.

---

## 4. Plugin Validation — External "Generate README" Command

### Scenario

A third-party plugin wants to add a `"Generate README"` command to AI Studio — without modifying any existing source code.

### Architecture

```
┌─────────────────────────────────────────────────┐
│  Plugin (separate package / file)               │
│                                                  │
│  import { CommandDefinition } from "ai-studio";  │
│                                                  │
│  const generateReadmeCmd: CommandDefinition = {  │
│    id: "plugin.readme.generate",                 │
│    title: "Generate README",                     │
│    description: "Generate README.md from code",  │
│    category: "plugin",                           │
│    keywords: ["readme", "generate", "docs"],     │
│    shortcut: "Ctrl+Shift+G",                     │
│    enabled: (ctx) => ctx.currentView !== "search",│
│    execute: (ctx) => {                           │
│      // Plugin's own logic — no AI Studio changes│
│      generateReadme(ctx);                        │
│    },                                            │
│  };                                              │
│                                                  │
│  // Registration via global Registry singleton   │
│  registry.register(generateReadmeCmd);           │
│                                                  │
│  // Cleanup on unload                             │
│  registry.unregister("plugin.readme.generate");  │
└─────────────────────────────────────────────────┘
```

### What the Plugin Needs

1. **Import `CommandDefinition` type** from `src/shared/command/types.ts` (already exists, no Electron/Node imports).
2. **Access to `ICommandRegistry`** — exposed as a global singleton (`registry`) or via IPC.
3. **No source code changes** to `Sidebar`, `App`, `Dashboard`, or any existing module. The new command appears in Command Palette automatically (Registry is the single source of truth for command discovery).

### What the Plugin Does NOT Need

- Does NOT need to modify `App.tsx` to add a button.
- Does NOT need to modify `Sidebar.tsx`.
- Does NOT need to touch IPC channels.
- Does NOT need to create new `ipcMain.handle()` entries.

### Verification

| Requirement | Met? | How |
|---|---|---|
| No existing source changes | ✅ | `registry.register()` is the only integration point |
| Command Palette picks it up | ✅ | Palette queries `registry.list()` / `registry.find()` |
| Keyboard shortcut works | ✅ | `shortcut` field in `CommandDefinition` |
| Clean unload | ✅ | `registry.unregister(id)` |
| Plugin isolation | ✅ | Plugin's `execute()` closure owns its logic |

**Verdict**: The architecture fully supports external plugin commands without modifying AI Studio source code.

---

## 5. AI Agent Validation — `workspace.openFile` Without UI Knowledge

### Scenario

A future AI agent (Claude, GPT-5, Gemini, etc.) needs to open a file in the user's workspace. The agent knows **nothing** about React, Zustand, Electron IPC, or PreviewPanel.

### Complete Flow

```
┌─────────────────────────────────────────────────────────┐
│  AI Agent (Claude / GPT / Gemini)                       │
│                                                          │
│  "Let me look at workspace/config.json"                 │
│                                                          │
│  Agent runtime invokes tool:                             │
│    tool_call("workspace.openFile", {                     │
│      path: "workspace/config.json"                       │
│    })                                                    │
│                                                          │
│  ↓  (tool → command mapping)                            │
│                                                          │
│  RuntimeManager.runTool("workspace.openFile", params)    │
│    → registry.execute("workspace.open-file", {           │
│        selectedFile: "workspace/config.json"             │
│      })                                                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Command Executor (Main process)                         │
│                                                          │
│  1. Look up CommandDefinition for "workspace.open-file"  │
│  2. Check enabled(context) → true                        │
│  3. Execute:                                             │
│     a. Resolve absolute path via PathResolver             │
│     b. workspaceService.readFileNode(path)               │
│     c. Push result to Renderer via IPC:                  │
│        mainWindow.webContents.send(                      │
│          "command:workspace.open-file:result",           │
│          { node, content }                               │
│        )                                                 │
│  4. Return CommandResult { success: true, commandId }    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Renderer (UI update)                                    │
│                                                          │
│  1. IPC handler receives the result                      │
│  2. workspacePreviewStore.open(path) called              │
│  3. PreviewPanel renders the file                        │
│                                                          │
│  The AI agent never knew about any of this.              │
│  It just called a tool.                                  │
└─────────────────────────────────────────────────────────┘
```

### What the AI Agent Does NOT Need to Know

| Concern | Hidden from Agent? | How |
|---|---|---|
| Which window to update | ✅ | Executor handles IPC target |
| PreviewPanel exists | ✅ | Renderer receives event, updates store |
| Zustand store API | ✅ | Renderer-side handler abstracts it |
| Electron IPC channels | ✅ | Executor abstracts it |
| File encoding | ✅ | WorkspaceProvider handles it |
| `App.tsx` view routing | ✅ | Command executor sets context |

### Agent-Agnostic Guarantee

The same `workspace.open-file` command works identically whether invoked by:
- A human pressing Ctrl+P and selecting a file
- Hermes agent calling `tool_call("workspace.openFile", ...)`
- Claude agent calling `tool_call("open_file", ...)`
- GPT agent calling `function_call("workspace_open_file", ...)`
- A plugin script calling `registry.execute("workspace.open-file", ctx)`

The agent-specific tool name is mapped to the canonical Command ID by the Runtime adapter. The Command System is the single universal dispatch point.

**Verdict**: AI agents can execute workspace operations with zero UI knowledge. The architecture fully abstracts UI concerns behind the Command boundary.

---

## 6. Future Compatibility Validation

### 6.1 Ctrl+P — File Quick Open

| Compatibility | **Full** |
|---|---|
| **How** | `Registry.find(query)` with `category: "workspace"` and fuzzy match on `keywords`. Results rendered in a Command Palette dropdown. Selected item → `registry.execute(result.id, ctx)`. |
| **Already validated** | M11c validation confirms Palette queries Registry for display, Executor for action. |

### 6.2 Ctrl+Shift+P — Command Palette (All Commands)

| Compatibility | **Full** |
|---|---|
| **How** | `Registry.list()` returns all registered commands. Palette renders them grouped by `category`. Same selection → execution flow as Ctrl+P. |
| **Already validated** | M11c validation confirms Palette can list all commands. |

### 6.3 Recent Files

| Compatibility | **Full** |
|---|---|
| **How** | A `workspace.open-recent` command queries a RecentFilesStore (populated by intercepting `workspace.open-file` executions). Command Palette's Ctrl+P shows recent files at top with `score` boost. |
| **Architecture note** | RecentFilesStore registers as a listener on `Registry` — when `workspace.open-file` executes successfully, it records the path. No cycle. Pattern: observer, not dependency. |

### 6.4 Quick Open (Fuzzy File Search)

| Compatibility | **Full** |
|---|---|
| **How** | `workspace.quick-open` command wraps `SearchProvider.findBySubstring(query)`. Already implemented IPC channel: `workspace:search:name`. The Command executor calls the search provider and returns ranked results. |
| **Current state** | SearchProvider exists. IPC channel exists. Just needs a Command wrapper. |

### 6.5 Workspace Search (Content Search)

| Compatibility | **Full** |
|---|---|
| **How** | Future `workspace.search-content` command wraps workspace content search. `WorkspaceProvider.searchText()` exists as a stub (throws "not implemented"). When content indexing is added (Phase 4/5), the Command executor routes to it. |
| **Risk** | None. The Command defines the interface; the implementation can be swapped without affecting command consumers. |

### 6.6 Tool Calling (AI Agent → Command)

| Compatibility | **Full** |
|---|---|
| **How** | `RuntimeManager.runTool(name, params)` → maps tool name to Command ID → `registry.execute(commandId, ctx)`. Workspace tools already use this pattern (`WorkspaceToolRegistry` + `WorkspaceToolExecutor`). Command System unifies tool execution with user command execution. |
| **Already validated** | M11c validation confirms tool → command mapping is compatible. |

### 6.7 Workflow Automation (Batch Commands)

| Compatibility | **Full** |
|---|---|
| **How** | A `BatchCommand` implements `CommandDefinition` with an `execute()` that sequentially invokes `registry.execute(id1, ctx)`, `registry.execute(id2, ctx)`, etc. Example: `"Prepare Release" → [dashboard.run-checks, workspace.rebuild-index, git.tag-release]`. |
| **Architecture note** | Batch commands are themselves registered in the Registry. They consume other commands. No special-casing needed — they are first-class Commands. |

### 6.8 Plugin Commands (Third-Party)

| Compatibility | **Full** |
|---|---|
| **How** | As demonstrated in Section 4. Plugins call `registry.register(cmd)`. Commands appear in Palette. Keyboard shortcuts work. Unload calls `registry.unregister(id)`. |
| **Architecture note** | Plugin isolation is guaranteed because `execute()` is a closure owned by the plugin. The Registry only holds a reference to the `CommandDefinition` object. |

### 6.9 Batch Commands (Sequential / Parallel)

| Compatibility | **Full** |
|---|---|
| **How** | Sequential: `for (const id of ids) { registry.execute(id, ctx); }`. Parallel: `Promise.all(ids.map(id => registry.execute(id, ctx)))`. The Executor is stateless — each execution is independent. |

### 6.10 Summary — Future Feature Compatibility Matrix

| Feature | Compatible | Gap |
|---|---|---|
| Ctrl+P (Quick Open) | ✅ | None |
| Ctrl+Shift+P (All Commands) | ✅ | None |
| Recent Files | ✅ | Needs RecentFilesStore (observer on Registry) |
| Quick Open (Fuzzy File) | ✅ | SearchProvider + IPC already exist |
| Workspace Search | ✅ | Stub exists; content indexing deferred to Phase 4/5 |
| Tool Calling | ✅ | Tool→Command mapping via RuntimeManager.runTool() |
| Workflow Automation | ✅ | BatchCommand consumes other commands |
| Plugin Commands | ✅ | register()/unregister() |
| Batch Commands | ✅ | Sequential/parallel via Promise patterns |

**Verdict**: All listed future features are fully compatible with the frozen Command System architecture.

---

## 7. Migration Plan

See companion document: [`docs/command-migration-plan.md`](./command-migration-plan.md)

---

## 8. Architecture Verdict

### Assessment

The Command System architecture, as defined in M11c, has been subjected to a rigorous verification covering:

1. **Complete action audit** — 10 existing user actions traced from current state to Command future. All pass with low migration risk.
2. **Module responsibility audit** — 11 modules classified into Consume/Register/Execute/Ignore. No misassigned responsibilities.
3. **Dependency cycle analysis** — Full matrix validated. Zero cycles. Clean DAG.
4. **Plugin compatibility** — External "Generate README" plugin demonstrated with zero source changes.
5. **AI agent abstraction** — `workspace.openFile` flow traced end-to-end. AI agent has zero UI knowledge.
6. **Future feature compatibility** — 9 future features validated. All compatible.

### Minor Architectural Notes (not blocking)

These are observations, not corrections:

1. **Registry location**: The frozen types define `ICommandRegistry` as a shared interface. Actual singleton placement (Main process, Renderer, or SharedWorker) is deferred to M11d. All options are compatible with the frozen architecture.

2. **Renderer-side command execution**: Some commands (`navigation.open-dashboard`, `workspace.close-preview`) are pure Renderer state changes. These could execute entirely in Renderer without IPC round-trip. The architecture supports both Main-side and Renderer-side executors — the Registry doesn't care where execution happens.

3. **Command context propagation**: `CommandContext` currently has `currentView`, `selectedFile`, `activeSessionId`, `query`. As more UI state becomes command-aware, this context may grow. This is expected evolution, not an architectural flaw.

### Verdict

**READY**

The Command System architecture is structurally sound, cycle-free, plugin-compatible, agent-agnostic, and future-proof. No corrections are required before proceeding to M11d (Command Registry + Executor implementation).
