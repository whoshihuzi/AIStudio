// Runtime types shared between main and preload.
// Mirrors AgentEvent from renderer but lives in the main process context.

export type AgentEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; toolName: string; input: unknown }
  | { type: "tool_result"; toolName: string; output: string }
  | { type: "done" }
  | { type: "error"; error: string };

export interface SessionMeta {
  id: string;
  title: string;
  runtime: string;
  adapter: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionData {
  meta: SessionMeta;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    parts: Array<{
      type: string;
      content?: string;
      language?: string;
      toolName?: string;
      input?: unknown;
      output?: string;
      status?: string;
    }>;
    timestamp: number;
  }>;
}
