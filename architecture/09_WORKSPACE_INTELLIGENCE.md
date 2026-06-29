# 09 — Workspace Intelligence

**v0.3 Architecture: Workspace Intelligence (not Workspace Browser).**

---

## Why Workspace Intelligence

A Workspace Browser shows files. A Workspace Intelligence understands them.

| Workspace Browser | Workspace Intelligence |
|---|---|
| Lists files in a tree | Indexes symbols, understands structure |
| Opens files for reading | Searches semantically across the project |
| Shows raw content | Provides context-aware diffs and patches |
| Passive display | Active analysis for AI agents |

AI Studio is not VS Code. The workspace is not for humans to browse — it's for AI agents to understand, search, modify, and verify code. Every workspace operation serves the AI's ability to contribute meaningful changes.

---

## Relationship to Existing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     v0.2.0 Foundation                        │
│                                                             │
│  Dashboard ──► displays project state                        │
│  Brain     ──► stores long-term AI context                   │
│  Context   ──► injects project awareness into Agents         │
│                                                             │
│                     v0.3.0 Extension                         │
│                                                             │
│  Workspace ──► gives Agents the ability to ACT on the code   │
│                                                             │
│  Dashboard asks: "Where are we?"                             │
│  Brain remembers: "What have we decided?"                    │
│  Context informs: "Here's what you need to know."            │
│  Workspace enables: "Now go change the code."                │
└─────────────────────────────────────────────────────────────┘
```

**The four systems form a complete loop**: understand → remember → inform → act.

---

## Workspace in the Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MAIN PROCESS                            │
│                                                              │
│  ┌──────────────┐                                           │
│  │Workspace      │  ← NEW: file operations, search, diff     │
│  │Provider       │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         ├──── consumed by DashboardService (file list)        │
│         ├──── consumed by ContextBuilder (project structure) │
│         └──── consumed by RuntimeManager (agent file ops)    │
│                                                              │
│  ┌──────────────┐                                           │
│  │SearchProvider │  ← FUTURE: full-text + symbol search      │
│  └──────────────┘                                           │
│                                                              │
│  ┌──────────────┐                                           │
│  │DiffProvider   │  ← FUTURE: git diff, patch generation     │
│  └──────────────┘                                           │
│                                                              │
│  IPC:                                                        │
│    workspace:read    workspace:write    workspace:list        │
│    workspace:search  workspace:stat    workspace:glob        │
└─────────────────────────────────────────────────────────────┘
```

---

## Why WorkspaceProvider Must Be in Provider Layer

1. **Principle 11**: The Renderer has no filesystem access. All file I/O must go through IPC to Main process.

2. **Principle 1**: Agent Agnostic. No adapter imports `fs` directly. Workspace changes flow through RuntimeManager → ContextBuilder (for awareness) or RuntimeManager → adapter (for execution).

3. **Principle 7**: Composition. WorkspaceProvider composes `fs` operations into the Provider pattern, same as GitProvider composes `git` CLI.

4. **Single Source of Truth**: If multiple components read/write files independently, race conditions and stale data become inevitable. WorkspaceProvider is the single gatekeeper for all filesystem access.

---

## WorkspaceProvider Future Extensions

### Diff (M12)

```
WorkspaceProvider.getDiff(file: string): Promise<DiffResult>
  → git diff for tracked files
  → text diff for untracked files

DiffProvider (future split):
  → getDiff(), applyPatch(), revertFile()
```

### Search (M11)

```
WorkspaceProvider.searchText(query: string): Promise<SearchResult[]>
  → full-text search across workspace

SearchProvider (future split):
  → searchText(), searchSymbol(), searchRegex()
  → index management, incremental updates
```

### Symbol Index (v0.4+)

```
SymbolProvider (future):
  → getSymbols(file): Symbol[]
  → getReferences(symbol): Reference[]
  → getCallGraph(symbol): Graph
  Requires: TypeScript language service integration
```

### Multi-Agent (v0.4+)

```
WorkspaceProvider exposes:
  → file locking (prevent concurrent writes)
  → change notifications (Agent A modified file → Agent B aware)
  → conflict detection (two agents modified same file)
```

---

## Layer Diagram (v0.3 target)

```
┌──────────────────────────────────────────────────────────────┐
│                       PRESENTATION                           │
│                                                              │
│  Dashboard Widgets:  WhereAmI  IsHealthy  ProjectBrain       │
│                      WhatNext  RecentActivity                │
│  NEW: WorkspaceExplorer (file tree, search bar)              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                       APPLICATION                            │
│                                                              │
│  DashboardStore  WorkspaceStore (NEW)  ChatStore  SessionStore│
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                         DOMAIN                                │
│                                                              │
│  IAgentRuntime  Message  MessagePart  WorkspaceNode (NEW)     │
│  WorkspaceEntry (NEW)  SearchResult (NEW)                    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE                           │
│                                                              │
│  Providers:                                                   │
│    GitProvider  TodoProvider  BrainProvider  SessionProvider  │
│    BuildProvider  ProjectInfoProvider  ValidationProvider     │
│    DesignPrinciplesProvider                                   │
│    WorkspaceProvider (NEW)  SearchProvider (FUTURE)           │
│                                                              │
│  ContextBuilder  BudgetAllocator  MarkdownFormatter           │
│  RuntimeManager  ProcessAgentRuntime  HermesAdapter           │
└──────────────────────────────────────────────────────────────┘
```

---

## Dependency Diagram (v0.3)

```
WorkspaceProvider
  │
  ├──► DashboardService       (file listing for UI)
  ├──► ContextBuilder         (project structure in context)
  │      └──► RuntimeManager  (→ Agent receives context)
  │
  └──► [FUTURE] SearchProvider
         └──► DashboardService (search results for UI)
         └──► ContextBuilder   (relevant files in context)

Renderer
  │  workspace:list ───► WorkspaceProvider.listDirectory()
  │  workspace:read ───► WorkspaceProvider.readFile()
  │  workspace:search ─► SearchProvider.searchText() (future)
  │
  NEVER: import { readFileSync } from "fs"
```

---

## Data Flow

```
User clicks file in WorkspaceExplorer
  │
  ▼
Renderer: window.api.workspace.read(path)
  │  IPC
  ▼
Main: WorkspaceProvider.readFile(path)
  │
  ├── stat(path) → check isDirectory / isFile / size
  ├── readFileSync(path) → content
  └── return { content, stat }
  │  IPC
  ▼
Renderer: WorkspaceStore.setActiveFile(data)
  │
  ▼
Agent sends prompt: "Fix the bug in session.ts"
  │
  ▼
ContextBuilder includes:
  - workspace.structure (file tree from WorkspaceProvider)
  - workspace.activeFile (currently open file)
  │
  ▼
Agent receives full context → generates code → 
  │
  ▼
DiffProvider.applyPatch(file, patch)  (future M12)
```

---

## What Is Frozen vs Evolving

### Frozen (v0.3 Architecture Freeze)

- WorkspaceProvider interface (read, write, list, stat, glob, search skeleton)
- IPC channel names and types
- Provider pattern (WorkspaceProvider is a Provider, same as GitProvider)
- Layer boundaries (Renderer never touches fs)
- Agent access path (Agent → RuntimeManager → ContextBuilder → WorkspaceProvider)

### Evolving (future milestones)

- SearchProvider implementation (M11)
- SymbolProvider (v0.4+)
- DiffProvider (M12)
- File locking for multi-agent (v0.4+)
- WorkspaceStore in Renderer (M10)
- WorkspaceExplorer widget (M10)
