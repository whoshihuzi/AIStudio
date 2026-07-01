// ============================================================
// documentBridge — transport-only bridge to the Command system.
//
// Responsibilities (FROZEN):
//   - Call window.api.command.execute(...)
//   - Return CommandResult with typed payload extraction
//
// Explicitly OUT OF SCOPE:
//   - NEVER imports DocumentStore.
//   - NEVER imports EditorStore.
//   - NEVER imports WorkspacePreviewStore.
//   - NEVER calls useDocumentStore / useEditorStore / useWorkspacePreviewStore.
//   - NEVER manipulates renderer state.
//   - NEVER calls window.api.workspace.read / write directly.
//
// Ownership rule:
//   Command → CommandResult → Renderer Store
//
// NOT:
//   Command → Bridge → Multiple Stores
//
// The bridge is a transport pipe. Renderer stores consume CommandResult
// themselves — the bridge must not become a renderer-side coordinator.
// ============================================================

import type { CommandResult } from "@shared/command/types";

// ----------------------------------------------------------
// documentBridge — execute a document-scoped command via IPC.
//
// The bridge wraps window.api.command.execute with the correct
// TypedCommandResult extraction. All document actions (open,
// close, ensure, reveal) use this single entry point.
//
// Callers (stores, components) are responsible for consuming
// the CommandResult and updating their own state.
// ----------------------------------------------------------

type TypedCommandResult<T = unknown> = CommandResult & { payload: T };

export async function documentBridge<T = unknown>(
  commandId: string,
  args?: Record<string, unknown>,
): Promise<TypedCommandResult<T>> {
  const raw = await window.api.command.execute(commandId, args);
  return raw as TypedCommandResult<T>;
}

// ----------------------------------------------------------
// Convenience wrappers — all route through documentBridge.
// These exist only for discoverability and correct typing.
// They do NOT add any logic beyond the bridge call.
// ----------------------------------------------------------

export function ensureDocument<T = unknown>(
  path: string,
): Promise<TypedCommandResult<T>> {
  return documentBridge<T>("document.ensure", { path });
}

export function activateDocument<T = unknown>(
  path: string,
): Promise<TypedCommandResult<T>> {
  return documentBridge<T>("document.activate", { path });
}

export function revealDocument<T = unknown>(
  path: string,
): Promise<TypedCommandResult<T>> {
  return documentBridge<T>("document.reveal", { path });
}

export function closeDocument<T = unknown>(
  path: string,
): Promise<TypedCommandResult<T>> {
  return documentBridge<T>("document.close", { path });
}
