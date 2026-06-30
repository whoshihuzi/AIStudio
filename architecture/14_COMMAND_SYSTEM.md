# 14 — Command System Architecture

**Frozen interaction architecture for AI Studio. No implementation.**

---

## Why a Command System

AI Studio has accumulated multiple interaction surfaces: Dashboard actions, Workspace Explorer clicks, Chat messages, keyboard shortcuts. Each surface invokes behavior differently. Without a unifying abstraction:

- Ctrl+P searches files → but SearchProvider doesn't know about file navigation
- "Refresh Dashboard" is a button → but it could also be a keyboard shortcut or an AI tool
- "Open Session" is a sidebar click → but it should also work from Command Palette
- AI agents will need tool calling → but tools are currently separate from UI commands

**A Command System unifies all interaction into a single abstraction.** Every action a user or AI can perform is a Command. The UI renders Commands. The keyboard invokes Commands. AI agents invoke Commands. Plugins register Commands.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         USER / AI                             │
│                                                              │
│  Keyboard      Command Palette      Sidebar      Chat         │
│  Ctrl+P        type "search"        click file   type "/"     │
│     │              │                   │           │          │
│     └──────────────┴───────────────────┴───────────┘          │
│                         │                                     │
│                         ▼                                     │
│               ┌──────────────────┐                            │
│               │ Command Registry │  (metadata + validation)   │
│               │  register()      │                            │
│               │  find()          │                            │
│               │  findByCategory()│                            │
│               │  list()          │                            │
│               │  execute()       │                            │
│               └────────┬─────────┘                            │
│                        │                                      │
│                        ▼                                      │
│               ┌──────────────────┐                            │
│               │ Command Executor │  (execution only)          │
│               │  execute(ctx)    │                            │
│               └────────┬─────────┘                            │
│                        │                                      │
│         ┌──────────────┼──────────────┐                       │
│         ▼              ▼              ▼                       │
│   Workspace      Dashboard       Runtime                      │
│   Provider       Service         Manager                      │
│   (file ops)     (refresh)       (agent ops)                  │
│                                                              │
│   Session        Search          Future                       │
│   Store          Provider        Plugin                       │
│   (navigate)     (file names)    (external)                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Ownership Boundaries

| Layer | Owns | Does NOT own |
|---|---|---|
| CommandRegistry | Metadata (id, title, category, keywords) Registration lifecycle | Execution logic, UI rendering |
| CommandExecutor | Execution dispatch Context validation | Metadata, registration |
| CommandPalette | UI rendering, filtering, shortcuts | Command execution |
| SearchProvider | Returns file search results as Commands | Command registration, execution |
| WorkspaceExplorer | Renders files as navigable nodes | Command system |
| RuntimeManager | Executes agent prompts | Command registration (agents register as tool commands) |

---

## Command Model (shared, no implementation)

```
Command Definition:
  id: string                e.g. "workspace.open-file"
  title: string             Display name
  description: string       Tooltip / help text
  category: CommandCategory Workspace | Dashboard | Session | Runtime | AI | Settings | Navigation
  keywords: string[]        Search terms for fuzzy matching
  shortcut?: string         e.g. "Ctrl+P"
  icon?: string             CSS class or icon name
  enabled(context): boolean Current context check
  execute(context): void    The action itself

Command Category:
  Workspace   — file operations, navigation
  Dashboard  — refresh, run checks, navigate
  Session    — create, switch, delete
  Runtime    — agent send, abort, tool execution
  AI         — AI-invoked tools
  Settings   — language, theme, config
  Navigation — go to dashboard, go to chat
  Plugin     — third-party extensions

Command Context:
  currentView: "dashboard" | "chat" | "search" | ...
  selectedFile?: WorkspaceNode
  activeSessionId?: string
  query?: string              (from palette input)
```

---

## Registry Design

### Responsibilities

- **register(command)**: Add a command to the registry. Plugins call this at startup.
- **unregister(id)**: Remove a command. Plugins call this at cleanup.
- **find(query)**: Fuzzy match by id, title, keywords. Returns scored results. Used by Command Palette.
- **findByCategory(cat)**: Return all commands in a category. Used by context menus.
- **list()**: Return all registered commands.
- **execute(id, context)**: Validate `enabled(context)`, then call `execute(context)`. Returns CommandResult.

### Lifecycle

```
App Start
  → Core commands register (workspace.*, dashboard.*, session.*, etc.)
  → Plugin commands register (if any loaded)
  → Runtime → ready

User Interaction
  → Command Palette opens (Ctrl+P / Ctrl+Shift+P)
  → User types query
  → Registry.find(query) returns scored matches
  → User selects → Registry.execute(id, context)
  → Executor dispatches to provider/service

AI Interaction
  → Agent produces tool call
  → Tool call maps to command id
  → Registry.execute(id, context) — same path as user
```

---

## Executor Design

### Separation from Registry

| Registry | Executor |
|---|---|
| Knows what commands exist | Knows how to run them |
| Handles discovery | Handles dispatch |
| Returns metadata | Returns results |
| Can be queried | Should not be queried |

The Registry holds Commands. The Executor runs them. Never merge the two into one class.

---

## Interaction Principles

1. **Everything executable is a Command.** Dashboard "Refresh" is a Command. Workspace "Open File" is a Command. Session "Switch" is a Command. No ad-hoc click handlers.

2. **Search produces Commands.** SearchProvider returns file matches. The Command Palette renders them as Commands. Selecting one executes "workspace.open-file".

3. **Workspace Explorer selects, Commands execute.** Clicking a file in the tree selects it (highlight). Double-clicking or pressing Enter invokes "workspace.open-file" Command.

4. **Dashboard actions are Commands.** "Refresh", "Run Checks", "Navigate to Chat" — all registered, all discoverable in Command Palette.

5. **AI tool calls are Commands.** When an agent wants to read a file, it invokes "workspace.read-file". When it wants to search, it invokes "workspace.search". Same registry path.

6. **Plugins add Commands.** A plugin registers Commands at startup. No special plugin API needed — just `registry.register()`.

---

## Future Compatibility

| Feature | How It Uses Commands |
|---|---|
| Ctrl+P | Opens Command Palette, Registry.find(query) |
| Ctrl+Shift+P | Opens Command Palette, shows ALL commands (no file filter) |
| Command Palette UI | Renders Registry.find() results |
| Recent Files | Command "workspace.open-recent" reads session history |
| Open Session | Command "session.switch" navigates |
| Run Checks | Command "dashboard.run-checks" calls BuildProvider |
| Refresh Dashboard | Command "dashboard.refresh" |
| Workspace Search | SearchProvider.findBySubstring() → results as Commands |
| AI Tool Calling | Agent tool → maps to command id → Registry.execute() |
| Plugins | register() at load, unregister() at unload |

**No feature requires redesign. All are Commands.**

---

## Implementation Roadmap

```
M11c: Architecture Freeze (this document) ← current
M11d: Command Registry + Executor (no UI)
M11e: Command Palette UI (Ctrl+P overlay)
M11f: Wire existing actions as Commands (Dashboard, Workspace, Session)
```

### NOT in scope (v0.4+)

- Plugin system (but the architecture supports it)
- Fuzzy search algorithm (v1 uses simple substring match)
- Command history / undo
- Command macros / sequences
- Command serialization for agent context
