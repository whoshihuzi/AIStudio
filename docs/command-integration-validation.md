# Command Integration Validation — M11d.3

First production Command integrations replacing direct service calls
with the Command abstraction.

## Commands Integrated

| Command ID              | Category  | Handler             | Existing Service Called               |
|-------------------------|-----------|---------------------|----------------------------------------|
| `dashboard.refresh`     | dashboard | DashboardHandler    | DashboardService (getData, getProjectInfo, getBrainData) |
| `workspace.refreshIndex`| workspace | WorkspaceHandler     | WorkspaceIndexStore (rebuild)          |
| `preview.close`         | workspace | PreviewHandler      | (pure UI state — renderer reacts)       |
| `runtime.runChecks`     | runtime   | RuntimeHandler      | DashboardService (runChecks → BuildProvider) |

## Execution Flow

```
UI Component
  ↓ window.api.command.execute(id)
Preload (IPC: command:execute)
  ↓ ipcMain.handle("command:execute")
Main Process
  ↓ commandExecutor.execute(commandId, context)
CommandExecutor
  ├─ Registry.get(id)           → validates command exists
  ├─ Handler lookup             → finds registered handler
  ├─ enabled(context) check     → validates context
  └─ handler.execute(ctx, id)   → dispatches to business logic
Handler
  └─ calls existing service(s)  → no duplicated logic
```

## Button → Command → Handler → Service Trace

### dashboard.refresh

- **UI**: DashboardHeader ↻ button → `useDashboardStore.refresh()`
- **Before**: `window.api.dashboard.getData()` + `window.api.project.getInfo()` + `window.api.brain.getData()` (three direct IPC calls)
- **After**: `window.api.command.execute("dashboard.refresh")` → `DashboardHandler.refresh()` → `dashboardService.getData()` + `dashboardService.getProjectInfo()` + `dashboardService.getBrainData()` in parallel
- **Behavior**: identical — all three data sources load, dashboard renders same content

### workspace.refreshIndex

- **UI**: no existing button (infrastructure for Command Palette / keyboard shortcuts)
- **Handler**: `WorkspaceHandler.refreshIndex()` → `WorkspaceIndexStore.rebuild()` → `WorkspaceIndexer.scanWithStats()`
- **IPC channel**: `workspace:index:rebuild` still available for direct calls (not yet migrated; no renderer usage)
- **Behavior**: index rebuild identical to existing `workspace:index:rebuild` IPC

### preview.close

- **UI**: PreviewPanel ✕ button
- **Before**: `useWorkspacePreviewStore.close()` directly
- **After**: `window.api.command.execute("preview.close")` + `useWorkspacePreviewStore.close()`
- **Handler**: `PreviewHandler` returns `{ success: true }` (pure UI state change, no backend service)
- **Behavior**: identical — preview panel closes, state resets

### runtime.runChecks

- **UI**: IsHealthy "Run Checks" / "Rerun Checks" buttons → `useDashboardStore.refreshBuild()`
- **Before**: `window.api.dashboard.runChecks()` (direct IPC)
- **After**: `window.api.command.execute("runtime.runChecks")` → `RuntimeHandler.runChecks()` → `dashboardService.runChecks()` → `BuildProvider.runTypecheck()` + `BuildProvider.runBuild()`
- **Behavior**: identical — typecheck and build run, results displayed in IsHealthy

## Verification Checklist

- [x] `dashboard.refresh`: button → command → handler → DashboardService
- [x] `workspace.refreshIndex`: command → handler → WorkspaceIndexStore
- [x] `preview.close`: button → command → handler → success
- [x] `runtime.runChecks`: button → command → handler → DashboardService.runChecks
- [x] No duplicated logic — handlers call existing services, don't reimplement
- [x] No behavioral changes — UI renders identically
- [x] `npm run typecheck` passes
- [x] `npm run build` passes
- [x] `window.api.command` exposed in preload with correct types in `env.d.ts`

## Files Changed

| File | Change |
|------|--------|
| `src/main/runtime/commands/CommandHandler.ts` | Added `commandId` parameter to `execute()` |
| `src/main/runtime/commands/CommandExecutor.ts` | Passes `commandId` to handler.execute() |
| `src/main/runtime/commands/handlers/DashboardHandler.ts` | Implements `dashboard.refresh` and `dashboard.open` |
| `src/main/runtime/commands/handlers/WorkspaceHandler.ts` | Implements `workspace.refreshIndex` |
| `src/main/runtime/commands/handlers/PreviewHandler.ts` | Implements `preview.close` |
| `src/main/runtime/commands/handlers/RuntimeHandler.ts` | Implements `runtime.runChecks` |
| `src/main/runtime/commands/handlers/SettingsHandler.ts` | Signature updated (stub) |
| `src/main/runtime/commands/handlers/SessionHandler.ts` | Signature updated (stub) |
| `src/main/index.ts` | Wires Registry + Executor + handlers, adds `command:execute` IPC |
| `src/preload/index.ts` | Exposes `window.api.command.execute()` |
| `src/renderer/env.d.ts` | Adds `command` API types |
| `src/renderer/stores/dashboard.ts` | Routes `refresh()` and `refreshBuild()` through commands |
| `src/renderer/components/PreviewPanel.tsx` | Routes close button through `command.execute` |

## Constraints Honored

- No Command Palette implemented
- No keyboard shortcuts implemented
- No fuzzy search implemented
- No plugins implemented
- No new services created
- No Dashboard logic duplicated
- No Workspace logic duplicated
- Handlers only orchestrate existing components
