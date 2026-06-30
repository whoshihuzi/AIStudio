// ============================================================
// Tool types — shared between Runtime and Tool layers.
// No adapter imports. No model imports. Pure types.
// ============================================================

/** A tool that can be registered and executed. */
export interface ToolDefinition {
  name: string;
  description: string;
  execute(params: Record<string, unknown>): Promise<ToolResult>;
}

/** Unified execution result for all tools. */
export interface ToolResult {
  success: boolean;
  name: string;
  error?: string;
  payload?: unknown;
}
