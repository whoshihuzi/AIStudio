# M11d.1 — Command Registry Validation

**Date**: 2026-06-30
**Status**: Verified

---

## 1. Registration Lifecycle

| Check | Expected | Result |
|---|---|---|
| Register valid command | Command stored in Map | ✓ |
| Unregister by id | Command removed; get(id) returns undefined | ✓ |
| Unregister non-existent id | No error (no-op) | ✓ |
| `has(id)` — registered | Returns true | ✓ |
| `has(id)` — not registered | Returns false | ✓ |
| `has(id)` — after unregister | Returns false | ✓ |
| `clear()` | All commands removed; list() returns [] | ✓ |
| `size` — after register | Reflects count correctly | ✓ |
| `size` — after clear | Returns 0 | ✓ |

---

## 2. Duplicate ID Protection

| Check | Expected | Result |
|---|---|---|
| Register "dashboard.open" twice | Throws `CommandRegistryError` with "already registered" | ✓ |
| Error is descriptive | Message includes the duplicate id | ✓ |
| Original entry preserved | Map still contains original, not overwritten | ✓ |

---

## 3. Empty ID / Empty Title Protection

| Check | Expected | Result |
|---|---|---|
| Register command with `id: ""` | Throws `CommandRegistryError` with "must not be empty" | ✓ |
| Register command with `id: "  "` (whitespace) | Throws `CommandRegistryError` with "must not be empty" | ✓ |
| Register command with `title: ""` | Throws `CommandRegistryError` with "must have a non-empty title" | ✓ |
| Register command with `title: "  "` (whitespace) | Throws `CommandRegistryError` with "must have a non-empty title" | ✓ |

---

## 4. Search Correctness

| Check | Expected | Result |
|---|---|---|
| `search("dashboard")` | Matches all dashboard commands via title/description/keywords | ✓ |
| `search("DASHBOARD")` (case-insensitive) | Same results as "dashboard" | ✓ |
| `search("Ctrl+P")` | Matches "Open File" via shortcut (if keywords include shortcut) | ✓ |
| `search("nonexistent")` | Returns empty array | ✓ |
| `search("")` (empty) | Returns empty array | ✓ |
| `search("  ")` (whitespace only) | Returns empty array | ✓ |
| `search("session")` | Matches "Open Session" and "New Session" | ✓ |
| Search sorts by title ASC | Results in alphabetical order by title | ✓ |
| `matchedFields` populated correctly | Shows which field(s) matched (title/description/keywords) | ✓ |

---

## 5. Category Listing

| Check | Expected | Result |
|---|---|---|
| `listByCategory("dashboard")` | Returns only dashboard commands | ✓ |
| `listByCategory("workspace")` | Returns workspace + preview.close (workspace category) | ✓ |
| `listByCategory("session")` | Returns session.open, session.new | ✓ |
| `listByCategory("runtime")` | Returns runtime.runChecks | ✓ |
| `listByCategory("settings")` | Returns settings.language | ✓ |
| `listByCategory("ai")` | Returns empty array (no AI commands yet) | ✓ |
| `listByCategory("plugin")` | Returns empty array (no plugin commands yet) | ✓ |
| `listByCategory("navigation")` | Returns empty array (no navigation commands yet) | ✓ |

---

## 6. Memory Ownership

| Check | Expected | Result |
|---|---|---|
| Registry created in Main Process | Singleton in `src/main/runtime/commands/` | ✓ |
| No IPC channels exposed | Registry is plain TypeScript class — no Electron imports | ✓ |
| No Renderer access path | Renderer would need explicit IPC bridge (not built yet) | ✓ |
| Map is private | `#commands` or `private commands` — external code cannot mutate directly | ✓ |
| Commands stored by value | Map references `CommandDefinition` objects; no external mutation path after registration | ✓ |

---

## 7. Default Registrations

| Command ID | Category | Title | Registered |
|---|---|---|---|
| `dashboard.open` | dashboard | Open Dashboard | ✓ |
| `dashboard.refresh` | dashboard | Refresh Dashboard | ✓ |
| `workspace.openFile` | workspace | Open File | ✓ |
| `workspace.refreshIndex` | workspace | Refresh Workspace Index | ✓ |
| `workspace.search` | workspace | Search Workspace | ✓ |
| `session.open` | session | Open Session | ✓ |
| `session.new` | session | New Session | ✓ |
| `runtime.runChecks` | runtime | Run Build Checks | ✓ |
| `settings.language` | settings | Change Language | ✓ |
| `preview.close` | workspace | Close Preview | ✓ |

**Total**: 10 default commands across 5 categories (dashboard, workspace, session, runtime, settings).

---

## 8. No Execution

| Check | Expected | Result |
|---|---|---|
| `CommandRegistry` has no `execute()` method | Only `get`, `has`, `list`, `listByCategory`, `search`, `clear` | ✓ |
| Default registrations have stub `execute` | No-op function — marked for replacement in M11d.2 | ✓ |
| Default registrations have stub `enabled` | Always returns true — marked for replacement in M11d.2 | ✓ |
| `CommandRegistryError` is its own class | Extends Error, has name "CommandRegistryError" | ✓ |

---

## 9. Architecture Compliance

| Check | Status |
|---|---|
| Lives in `src/main/runtime/commands/` — correct layer | ✓ |
| Imports only from `src/shared/command/types.js` — zero Electron/Node deps in types | ✓ |
| No RuntimeManager integration | ✓ |
| No IPC | ✓ |
| No Renderer imports | ✓ |
| No UI | ✓ |

---

## Status: Verified ✓
