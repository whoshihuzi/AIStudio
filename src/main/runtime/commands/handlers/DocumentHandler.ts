// ============================================================
// DocumentHandler — Document lifecycle commands ONLY.
//
// Responsibilities (FROZEN):
//   - document.ensure   — validate existence via WorkspaceService
//   - document.activate — signal a document is now active
//   - document.reveal   — reveal in system file manager
//   - document.close    — signal a document is closed
//
// Explicitly OUT OF SCOPE:
//   - NEVER reads file content.
//   - NEVER writes file content.
//   - NEVER calls readFile / readFileNode / workspace.read.
//
// Content loading belongs to the content-loading layer:
//   PreviewStore, EditorStore, or a future ContentProvider.
//
// Separation of concerns:
//   DocumentHandler = lifecycle (does this document exist? is it open?)
//   Preview / Editor = content (what does the file contain?)
// ============================================================

import { shell } from "electron";
import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";
import { workspaceService } from "../../../workspace/WorkspaceService.js";

export class DocumentHandler implements CommandHandler {
  async execute(context: CommandContext, commandId: string): Promise<CommandResult> {
    switch (commandId) {
      case "document.ensure":
        return this.ensureExists(context);

      case "document.activate":
        return this.activate(context);

      case "document.reveal":
        return this.reveal(context);

      case "document.close":
        return this.close(context);

      default:
        return {
          success: false,
          commandId,
          error: `DocumentHandler: unknown command "${commandId}".`,
        };
    }
  }

  // ----------------------------------------------------------
  // document.ensure — validate document existence.
  // ----------------------------------------------------------

  private ensureExists(context: CommandContext): CommandResult {
    const path = context.selectedFile;
    if (!path) {
      return {
        success: false,
        commandId: "document.ensure",
        error: "No file path provided.",
      };
    }

    const exists = workspaceService.exists(path);
    return {
      success: exists,
      commandId: "document.ensure",
      payload: { path, exists },
      error: exists ? undefined : `File not found: ${path}`,
    };
  }

  // ----------------------------------------------------------
  // document.activate — signal a document is now the active/focused one.
  // Pure lifecycle signal — no content access.
  // ----------------------------------------------------------

  private activate(context: CommandContext): CommandResult {
    const path = context.selectedFile;
    if (!path) {
      return {
        success: false,
        commandId: "document.activate",
        error: "No file path provided.",
      };
    }

    return {
      success: true,
      commandId: "document.activate",
      payload: { path, action: "activated" },
    };
  }

  // ----------------------------------------------------------
  // document.reveal — show the file in system file manager.
  // ----------------------------------------------------------

  private async reveal(context: CommandContext): Promise<CommandResult> {
    const path = context.selectedFile;
    if (!path) {
      return {
        success: false,
        commandId: "document.reveal",
        error: "No file path provided.",
      };
    }

    try {
      shell.showItemInFolder(path);
      return {
        success: true,
        commandId: "document.reveal",
        payload: { path },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "document.reveal",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ----------------------------------------------------------
  // document.close — signal a document is no longer open.
  // Pure lifecycle signal — no content access.
  // ----------------------------------------------------------

  private close(context: CommandContext): CommandResult {
    const path = context.selectedFile;
    return {
      success: true,
      commandId: "document.close",
      payload: { path, action: "closed" },
    };
  }
}
