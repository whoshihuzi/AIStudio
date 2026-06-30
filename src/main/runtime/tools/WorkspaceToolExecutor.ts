// ============================================================
// WorkspaceToolExecutor — executes tools by name.
// No prompt knowledge. No model knowledge. No adapter knowledge.
// ============================================================

import type { WorkspaceToolRegistry } from "./WorkspaceToolRegistry.js";
import type { ToolResult } from "./types.js";

export class WorkspaceToolExecutor {
  constructor(private readonly registry: WorkspaceToolRegistry) {}

  /**
   * Execute a tool by name with the given parameters.
   * Returns unified ToolResult regardless of success/failure.
   */
  async execute(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.registry.get(name);
    if (!tool) {
      return { success: false, name, error: `Tool not found: ${name}` };
    }
    try {
      return await tool.execute(params);
    } catch (err) {
      return { success: false, name, error: String(err) };
    }
  }

  /** Run multiple tools sequentially. Stops on first failure if stopOnError=true. */
  async executeAll(
    calls: Array<{ name: string; params: Record<string, unknown> }>,
    stopOnError = false,
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    for (const call of calls) {
      const result = await this.execute(call.name, call.params);
      results.push(result);
      if (!result.success && stopOnError) break;
    }
    return results;
  }
}
