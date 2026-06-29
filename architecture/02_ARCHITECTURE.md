# 02 — Architecture

**The current architecture of AIStudio.**

---

## Process Model

AIStudio is an **Electron** application with two processes:

```
┌─────────────────────┐     IPC (contextBridge)     ┌─────────────────────┐
│   RENDERER PROCESS  │◄──────────────────────────►│    MAIN PROCESS     │
│                     │                             │                     │
│  React + Zustand    │                             │  Node.js + Electron │
│  UI only            │                             │  File system, Git   │
│  No Node.js APIs    │                             │  Child processes    │
│  No file system     │                             │  Session store      │
└─────────────────────┘                             └─────────────────────┘
```

The **preload script** (`src/preload/index.ts`) is the only bridge between them. It exposes a stable API via `contextBridge.exposeInMainWorld("api", ...)`. The Renderer never accesses Node.js APIs directly.

---

## Layer Architecture

The project follows a four-layer architecture defined in `docs/04_ARCHITECTURE.md`:

| Layer | Location | Responsibility | Examples |
|---|---|---|---|
| Presentation | `src/renderer/components/` | UI rendering | ChatView, Sidebar, MessageList |
| Application | `src/renderer/stores/` | State management, workflows | ChatStore, SessionStore |
| Domain | `src/renderer/runtime/types.ts` | Core abstractions | Message, MessagePart, IAgentRuntime |
| Infrastructure | `src/main/runtime/` | External systems | HermesAdapter, SessionStore |

**Dependency rule**: Upper layers depend on lower layers. Never the reverse.

---

## Key Abstractions

### IAgentRuntime (Domain Layer)

```typescript
// src/renderer/runtime/types.ts
interface IAgentRuntime {
  sendMessage(prompt: string): AsyncIterable<AgentEvent>;
  abort(): void;
}
```

This is the **architectural boundary**. Every AI agent (Hermes, Claude, GPT, future) implements this interface. The Renderer ONLY knows `IAgentRuntime` — never a concrete adapter name.

### AgentBridge (Application Layer)

```typescript
// src/renderer/runtime/agent-bridge.ts
class AgentBridge implements IAgentRuntime {
  // Converts IPC event stream → AsyncIterable<AgentEvent>
  // Renderer never knows which runtime is on the other side
}
```

### ProcessAgentRuntime (Infrastructure Layer)

```typescript
// src/main/runtime/process-agent-runtime.ts
abstract class ProcessAgentRuntime {
  // Manages child process lifecycle: spawn, stdout/stderr, abort
  // Subclasses implement: buildCommand(), parseLine(), parseStderrLine()
}
```

### HermesAdapter (Infrastructure Layer)

```typescript
// src/main/runtime/hermes-adapter.ts (40 lines)
class HermesAdapter extends ProcessAgentRuntime {
  // buildCommand: hermes chat --cli -q --resume <prompt>
  // parseLine: strip ANSI → {type: "text", content}
}
```

### RuntimeManager (Infrastructure Layer)

```typescript
// src/main/runtime/runtime-manager.ts
class RuntimeManager {
  // Adapter registry: {"hermes" → HermesAdapter}
  // Main process imports ONLY RuntimeManager, never individual adapters
}
```

---

## Current Module Map

```
src/
├── main/
│   ├── index.ts                          # Electron main entry, IPC handlers, lifecycle
│   └── runtime/
│       ├── types.ts                      # AgentEvent, SessionMeta, SessionData
│       ├── process-agent-runtime.ts      # Abstract base: spawn/abort/parse
│       ├── hermes-adapter.ts             # Hermes CLI adapter (40 lines)
│       ├── runtime-manager.ts            # Adapter registry + run orchestration
│       └── session-store.ts              # JSON file persistence
│
├── preload/
│   └── index.ts                          # contextBridge API (agent + session)
│
└── renderer/
    ├── main.tsx                          # React entry + sessionPersistence.start()
    ├── App.tsx                           # Root: Sidebar + ChatView
    ├── env.d.ts                          # window.api type declarations
    │
    ├── components/
    │   ├── Sidebar.tsx                   # Session list, create/switch/delete
    │   ├── ChatView.tsx                  # Chat container: StatusBar + MessageList + ChatInput
    │   ├── ChatInput.tsx                 # Textarea with auto-resize
    │   ├── MessageList.tsx               # Message renderer with PartRenderer dispatch
    │   ├── StatusBar.tsx                 # Idle/Running state + Cancel button
    │   ├── TextRenderer.tsx              # Markdown → HTML (react-markdown + GFM)
    │   ├── CodeRenderer.tsx              # Syntax highlight + copy button
    │   ├── ToolRenderer.tsx              # Collapsible tool call card
    │   ├── ThinkingRenderer.tsx          # Collapsible thinking block
    │   ├── ImageRenderer.tsx             # Placeholder (📷)
    │   └── FileRenderer.tsx              # Placeholder (📎)
    │
    ├── runtime/
    │   ├── types.ts                      # Message, MessagePart, AgentEvent, IAgentRuntime
    │   ├── agent-bridge.ts               # IAgentRuntime over IPC
    │   └── echo-runtime.ts              # (Deprecated) Stub from M3
    │
    └── stores/
        ├── chat.ts                       # Zustand: messages, sendMessage, cancelRequest
        ├── session.ts                    # Zustand: sessions CRUD, activeSessionId
        └── session-persistence.ts        # Auto-save: Zustand subscriber + debounce + flush
```

---

## IPC Protocol

All communication between Renderer and Main flows through the preload bridge.

### Agent IPC (fire-and-forget + event stream)

```
Renderer                    Main
   │                          │
   │── agent:send ──────────►│  spawn Hermes, stream events back
   │                          │
   │◄─ agent:event ──────────│  text / code / tool_call / tool_result / thinking / done / error
   │                          │
   │── agent:abort ─────────►│  SIGTERM → 3s → SIGKILL
```

### Session IPC (request-response)

```
Renderer                    Main
   │                          │
   │── session:create ──────►│  create JSON file + update index
   │◄──────────── return ────│
   │                          │
   │── session:list ────────►│  read index.json
   │◄──────────── return ────│
   │                          │
   │── session:load ────────►│  read {id}.json
   │◄──────────── return ────│
   │                          │
   │── session:save ────────►│  writeFileSync
   │                          │
   │── session:delete ──────►│  unlinkSync + update index
```

### Lifecycle IPC

```
Main                        Renderer
 │                             │
 │── session:flush-request ──►│  "About to quit — save now"
 │                             │── flush() → session:save
 │                             │── session:flush-complete
 │◄───────────────────────────│
 │                             │
 │── performQuit()            │
```

---

## Session Persistence

Sessions are stored as JSON files:

```
workspace/sessions/
├── index.json                        # [{id, title, runtime, adapter, createdAt, updatedAt}]
├── session_1234567890_abc123.json    # {meta, messages: [...]}
└── session_1234567891_def456.json
```

### Save Trigger

1. **Debounced auto-save**: `SessionPersistence` (NOT a React component) subscribes to Zustand chat store. After 2 seconds of inactivity, it flushes messages to disk.
2. **Exit flush**: Main process intercepts window close → sends `session:flush-request` → Renderer flushes → replies `session:flush-complete` → Main process quits.
3. **Switch session**: `switchSession()` saves the current session before loading the next one.

This architecture guarantees that messages are NEVER lost on app exit, regardless of whether the debounce timer has fired.

---

## MessagePart Model

```typescript
type MessagePart =
  | TextPart      // {type: "text", content: string}
  | CodePart      // {type: "code", language: string, content: string}
  | ToolPart      // {type: "tool", toolName: string, input, output?, status}
  | ThinkingPart  // {type: "thinking", content: string}
  | ImagePart     // {type: "image", mimeType, data, alt?}      — placeholder
  | FilePart;     // {type: "file", fileName, mimeType, data, size} — placeholder
```

The PartRenderer in `MessageList.tsx` dispatches by `part.type` only. Adding a new part type requires:
1. Add the type to `MessagePart` union
2. Create a renderer component
3. Add one `case` to the `switch` in `PartRenderer`

No other files need to change.

---

## Build Pipeline

```
electron-vite build
  ├── Main process    → out/main/index.js     (tsc-like, Node target)
  ├── Preload script  → out/preload/index.mjs (ESM, sandbox-compatible)
  └── Renderer        → out/renderer/         (Vite, HMR, React)
```

- `npm run typecheck` = `tsc -b --noEmit` (separate from build)
- `npm run build` = `electron-vite build` (produces `out/`)
- `npm start` = `electron .` (loads from `out/`)
- `npm run dev` = `electron-vite dev` (HMR, dev server)

---

## Technology Stack

For exact versions, see `package.json` (single source of truth).

| Category | Choice | Notes |
|---|---|---|
| Desktop framework | Electron | See `decisions/001_electron-as-desktop-framework.md` |
| Build tool | electron-vite | Three-entry build: main/preload/renderer |
| Language | TypeScript | `strict: true`, project references |
| UI framework | React | With Zustand for state management |
| Styling | Tailwind CSS | v3, dark theme first |
| Markdown | react-markdown + remark-gfm | GFM support |
| Code highlight | react-syntax-highlighter | Prism, vscDarkPlus theme |
| ANSI stripping | strip-ansi | For Hermes CLI output cleanup |

For the full technology roadmap (future choices: Monaco, xterm.js, SQLite, etc.), see `docs/05_TECH_STACK.md`.
