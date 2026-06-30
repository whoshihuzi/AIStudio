// ============================================================
// WorkspaceToolRegistry — registers all workspace tools.
// No adapter knowledge. No model knowledge. Pure tool layer.
// ============================================================

import { WorkspaceService } from "../../workspace/WorkspaceService.js";
import type { ToolDefinition, ToolResult } from "./types.js";

export class WorkspaceToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor(private readonly ws: WorkspaceService) {
    this.registerAll();
  }

  /** Get a tool by name. */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /** List all registered tool names. */
  list(): string[] {
    return [...this.tools.keys()];
  }

  // ----------------------------------------------------------
  // Registration
  // ----------------------------------------------------------

  private registerAll(): void {
    this.register({
      name: "readFile",
      description: "Read file contents from the workspace.",
      execute: async (p) => {
        const result = this.ws.readFileNode(p.path as string);
        return ok("readFile", result);
      },
    });

    this.register({
      name: "writeFile",
      description: "Write content to a file in the workspace.",
      execute: async (p) => {
        this.ws.writeFile(p.path as string, p.content as string);
        return ok("writeFile", { path: p.path });
      },
    });

    this.register({
      name: "listDirectory",
      description: "List directory contents.",
      execute: async (p) => {
        const nodes = this.ws.listNodes(p.path as string);
        return ok("listDirectory", nodes);
      },
    });

    this.register({
      name: "exists",
      description: "Check if a file or directory exists.",
      execute: async (p) => {
        return ok("exists", this.ws.exists(p.path as string));
      },
    });

    this.register({
      name: "stat",
      description: "Get file or directory metadata.",
      execute: async (p) => {
        const node = this.ws.statNode(p.path as string);
        return ok("stat", node);
      },
    });

    this.register({
      name: "rename",
      description: "Rename or move a file or directory.",
      execute: async (p) => {
        this.ws.rename(p.from as string, p.to as string);
        return ok("rename", { from: p.from, to: p.to });
      },
    });

    this.register({
      name: "mkdir",
      description: "Create a new directory.",
      execute: async (p) => {
        this.ws.mkdir(p.path as string);
        return ok("mkdir", { path: p.path });
      },
    });

    this.register({
      name: "delete",
      description: "Delete a file or directory.",
      execute: async (p) => {
        this.ws.delete(p.path as string);
        return ok("delete", { path: p.path });
      },
    });

    this.register({
      name: "copy",
      description: "Copy a file or directory.",
      execute: async (p) => {
        this.ws.copy(p.from as string, p.to as string);
        return ok("copy", { from: p.from, to: p.to });
      },
    });

    this.register({
      name: "move",
      description: "Move a file or directory.",
      execute: async (p) => {
        this.ws.move(p.from as string, p.to as string);
        return ok("move", { from: p.from, to: p.to });
      },
    });
  }

  private register(def: ToolDefinition): void {
    this.tools.set(def.name, def);
  }
}

function ok(name: string, payload: unknown): ToolResult {
  return { success: true, name, payload };
}

function fail(name: string, error: string): ToolResult {
  return { success: false, name, error };
}
