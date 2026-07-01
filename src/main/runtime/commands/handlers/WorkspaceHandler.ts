// ============================================================
// WorkspaceHandler — orchestrates workspace commands.
//
// Handles: workspace.openFile, workspace.refreshIndex, workspace.search
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";
import type { WorkspaceIndexStore } from "../../../workspace/WorkspaceIndexStore.js";
import type { SearchProvider } from "../../../workspace/SearchProvider.js";
import { workspaceService } from "../../../workspace/WorkspaceService.js";

export class WorkspaceHandler implements CommandHandler {
  constructor(
    private readonly indexStore: WorkspaceIndexStore,
    private readonly searchProvider?: SearchProvider,
  ) {}

  async execute(context: CommandContext, commandId: string): Promise<CommandResult> {
    switch (commandId) {
      case "workspace.refreshIndex":
        return this.refreshIndex();
      case "workspace.openFile":
        return this.openFile(context);
      case "workspace.search":
        return this.search(context);
      default:
        return { success: false, commandId, error: `WorkspaceHandler: unknown command "${commandId}"` };
    }
  }

  // ----------------------------------------------------------
  // workspace.refreshIndex — rebuild the project file index
  // ----------------------------------------------------------

  private refreshIndex(): CommandResult {
    try {
      const stats = this.indexStore.rebuild();
      return {
        success: true,
        commandId: "workspace.refreshIndex",
        payload: { stats },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "workspace.refreshIndex",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ----------------------------------------------------------
  // workspace.openFile — read a file from the workspace
  // ----------------------------------------------------------

  private openFile(context: CommandContext): CommandResult {
    try {
      const filePath = context.selectedFile;
      if (!filePath) {
        return {
          success: false,
          commandId: "workspace.openFile",
          error: "No file selected. Provide a file path via context.selectedFile.",
        };
      }

      if (!workspaceService.exists(filePath)) {
        return {
          success: false,
          commandId: "workspace.openFile",
          error: `File not found: ${filePath}`,
        };
      }

      const fileNode = workspaceService.readFileNode(filePath);
      return {
        success: true,
        commandId: "workspace.openFile",
        payload: { node: fileNode.node, content: fileNode.content },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "workspace.openFile",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ----------------------------------------------------------
  // workspace.search — search workspace files by name
  // ----------------------------------------------------------

  private search(context: CommandContext): CommandResult {
    try {
      const query = context.query?.trim();
      if (!query) {
        return {
          success: false,
          commandId: "workspace.search",
          error: "No search query provided. Set context.query.",
        };
      }

      if (!this.searchProvider) {
        return {
          success: false,
          commandId: "workspace.search",
          error: "Search is not available — no SearchProvider configured.",
        };
      }

      const results = this.searchProvider.findBySubstring(query);
      return {
        success: true,
        commandId: "workspace.search",
        payload: { query, results, count: results.length },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "workspace.search",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
