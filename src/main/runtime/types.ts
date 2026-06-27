// Runtime types shared between main and preload.
// Mirrors AgentEvent from renderer but lives in the main process context.

export type AgentEvent =
  | { type: "text"; content: string }
  | { type: "code"; language: string; content: string }
  | { type: "tool_call"; toolName: string; input: unknown }
  | { type: "tool_result"; toolName: string; output: string }
  | { type: "thinking"; content: string }
  | { type: "image"; mimeType: string; data: string; alt?: string }
  | { type: "file"; fileName: string; mimeType: string; data: string; size?: number }
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
      mimeType?: string;
      data?: string;
      alt?: string;
      fileName?: string;
      size?: number;
    }>;
    timestamp: number;
  }>;
}
