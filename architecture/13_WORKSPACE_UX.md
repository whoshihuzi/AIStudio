# 13 — Workspace UX Architecture

**Frozen interaction model for Workspace. No implementation.**

---

## 1. Workspace Layout

```
┌──────────────────────────────────────────────────────────────┐
│                        APP ROOT                               │
│                                                              │
│  ┌──────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │          │  │                    │  │                  │  │
│  │ Sidebar  │  │   Main Content     │  │  Preview Panel   │  │
│  │          │  │                    │  │                  │  │
│  │ Dashboard│  │  Dashboard         │  │  File content    │  │
│  │ Workspace│  │  or                │  │  (w-96,          │  │
│  │ Sessions │  │  Chat              │  │   resizable)     │  │
│  │          │  │  or                │  │                  │  │
│  │          │  │  Search            │  │  Visible when    │  │
│  │          │  │  or                │  │  previewFile     │  │
│  │          │  │  Editor (future)   │  │  is set          │  │
│  │          │  │                    │  │                  │  │
│  └──────────┘  └────────────────────┘  └──────────────────┘  │
│                                                              │
│  Sidebar:    fixed w-56, never resizes                       │
│  Main:       flex-1, fills remaining space                   │
│  Preview:    w-96 default, resizable (future),               │
│              independent of Main view                        │
└──────────────────────────────────────────────────────────────┘
```

### Key Rule

**Preview is NOT a child of Dashboard.** It is a sibling at App Root. Any Main Content view (Dashboard, Chat, Search, Editor) can coexist with an open Preview panel. This is the critical architectural distinction vs the current implementation where `App.tsx` nests preview inside the Dashboard condition.

---

## 2. View Model

```typescript
interface WorkspaceViewState {
  // ── Navigation ──
  currentView: "dashboard" | "chat" | "search" | "editor";
  selectedSessionId: string | null;

  // ── Workspace Explorer ──
  selectedWorkspaceNode: WorkspaceNode | null;
  expandedDirectories: string[];

  // ── Preview ──
  preview: {
    file: PreviewFile | null;
    visible: boolean;
    width: number;              // pixels, default 384 (w-96)
  };

  // ── Chat ──
  chatInputDraft: Record<string, string>;  // sessionId → draft text
  sessionScrollPositions: Record<string, number>;  // sessionId → scrollTop
}
```

### Responsibilities

| Field | Owner | Persistence |
|---|---|---|
| `currentView` | App.tsx state | Session-only (not persisted) |
| `selectedSessionId` | SessionStore | Yes (session list) |
| `selectedWorkspaceNode` | WorkspaceStore | Session-only |
| `expandedDirectories` | WorkspaceStore | Session-only |
| `preview` | WorkspacePreviewStore | Session-only |
| `chatInputDraft` | ChatStore | Yes (per session) |
| `sessionScrollPositions` | ChatStore | Yes (per session) |

---

## 3. Navigation Rules

```
┌─────────────────────┬─────────────────┬─────────────────┬──────────────────────────┐
│ Action              │ Current View    │ Preview         │ Result                   │
├─────────────────────┼─────────────────┼─────────────────┼──────────────────────────┤
│ Click Dashboard     │ any             │ unchanged       │ Main → Dashboard         │
│ Click Session       │ any             │ unchanged       │ Main → Chat, load session│
│ Click file in tree  │ any             │ opens file      │ Preview updates,         │
│                     │                 │                 │ Main unchanged           │
│ Click file again    │ any             │ file open       │ Refresh preview          │
│ Click folder        │ any             │ unchanged       │ Toggle expand/collapse   │
│ Click Preview Close │ any             │ closes          │ Preview hidden,          │
│                     │                 │                 │ Main unchanged           │
│ Press Esc           │ any             │ open            │ Preview closes           │
│ Click Search Result │ search          │ opens file      │ Main stays Search,       │
│                     │                 │                 │ Preview shows file       │
│ Send Chat Message   │ chat            │ unchanged       │ Agent receives context   │
│ Run Build Check     │ dashboard       │ unchanged       │ Status updates in-place  │
└─────────────────────┴─────────────────┴─────────────────┴──────────────────────────┘
```

### Invariants

1. **Preview never changes `currentView`.** Opening a file from Dashboard keeps you on Dashboard. Opening a file from Chat keeps you on Chat.
2. **Clicking a Session always switches to Chat.** No exception.
3. **Preview Close returns to previous Main state.** No navigation side-effect.
4. **Esc closes Preview.** No confirmation dialog.

---

## 4. Preview Rules

### Ownership

Preview belongs to Workspace, not Dashboard. The `WorkspacePreviewStore` manages preview state. Dashboard never reads or writes preview state.

### Behavior

```
Open:   Click file in WorkspaceExplorer tree
        Click search result (future)
        Agent references a file (future)

Close:  Click ✕ button
        Press Esc
        PreviewPanel close() called

Resize: Drag left border (future M11)
        Min width: 256px
        Max width: 50% of window

Refresh: Click ↻ button
         File changed on disk (future: fs watcher)

Pin:    (future) Pin icon toggles "lock"
        Pinned preview: clicking another file opens NEW preview
        Unpinned: clicking another file replaces preview
```

### States

| State | Condition | Display |
|---|---|---|
| Empty | No file selected | "Select a file from Workspace Explorer to preview." |
| Loading | IPC in flight | Skeleton (8 lines pulse) |
| Error | IPC failed | "Cannot read file." + Retry button |
| Content | File loaded | Header + monospace content |

---

## 5. Chat View Rules

### Session Scroll

```
Save:    When leaving a chat session, save:
           sessionScrollPositions[sessionId] = container.scrollTop

Restore: When entering a chat session:
           if sessionScrollPositions[sessionId] exists:
             container.scrollTop = saved value
           else:
             container.scrollTop = container.scrollHeight (bottom)

Timing:  Restore MUST happen AFTER React render is complete
         (useEffect after messages load, not during)
```

### Input Draft

```
Save:    When leaving a chat session, save:
           chatInputDraft[sessionId] = textarea.value

Restore: When entering a chat session:
           if chatInputDraft[sessionId] exists:
             textarea.value = saved draft
           else:
             textarea.value = ""

Clear:   On send, delete chatInputDraft[sessionId]
```

---

## 6. Workspace Explorer Rules

### Selection

```
Click folder:
  → toggle expandedDirectories[path]
  → no preview change

Click file:
  → set selectedWorkspaceNode = file
  → open preview for file
  → apply highlight class to selected node

Click file again (already selected):
  → refresh preview (re-read file)

Current node highlight:
  → bg-gray-700 text-gray-100 when selectedWorkspaceNode.path === node.path
```

### Expand persistence

```
expandedDirectories is stored in WorkspaceStore (Zustand).
Survives view switches (Dashboard ↔ Chat).
Does NOT survive app restart (acceptable for v1).
```

---

## 7. Future Compatibility

### Editor View (M12+)

```
currentView = "editor"
Main: Monaco editor instance
Preview: can show diff, documentation, or reference file
Sidebar: unchanged
```

### Search View (M11)

```
currentView = "search"
Main: search bar + results list
Preview: shows clicked result file
Click result → preview opens (Main stays Search)
```

### Diff View (M12+)

```
currentView = "editor" (or "diff")
Main: Monaco diff editor
Preview: can show original file for reference
```

### Command Palette (future)

```
Ctrl+P / Cmd+P → overlay
Type file name → preview opens (Main unchanged)
Type command → executes
Compatible with all currentView values
```

### Compatibility Check

| Future Feature | Conflicts with current ViewState? |
|---|---|
| Search View | No — new `currentView` value, rest unchanged |
| Editor View | No — new `currentView` value, rest unchanged |
| Diff View | No — reuses Editor + Preview |
| Command Palette | No — overlay, doesn't change ViewState |
| Multi-Preview | No — extends `preview` from single to array |
| Split View | No — extends Main from single to split panes |

---

## 8. Current UX Issues (Audit)

| # | Issue | Location | Severity |
|---|---|---|---|
| U1 | Preview nested in App.tsx as conditional child of Dashboard | `App.tsx:16` | High |
| U2 | Preview closes when switching Dashboard→Chat | `App.tsx` | High |
| U3 | No session scroll restore | `ChatView.tsx` | Medium |
| U4 | No chat input draft save | `ChatInput.tsx` | Medium |
| U5 | No selected file highlight in tree | `WorkspaceTreeNode.tsx` | Medium |
| U6 | No Esc to close preview | `PreviewPanel.tsx` | Low |
| U7 | Preview width not resizable | `PreviewPanel.tsx` | Low |
| U8 | No expanded directory persistence across views | `WorkspaceStore` | Low |

### Fix Priority

```
M10.8b: U1 (move preview to App Root) + U2 (preview survives navigation)
M10.8c: U5 (file highlight) + U6 (Esc close)
M10.8d: U3 (scroll restore) + U4 (input draft)
M10.8e: U7 (resize) + U8 (expand persistence)
```
