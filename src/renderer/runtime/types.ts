// ============================================================
// Message Content Model — complete, no future upgrades needed
// ============================================================

export type MessagePart = TextPart | CodePart | ToolPart
  | ThinkingPart | ImagePart | FilePart;

export interface TextPart {
  type: "text";
  content: string;
}

export interface CodePart {
  type: "code";
  language: string;
  content: string;
}

export interface ToolPart {
  type: "tool";
  toolName: string;
  input: unknown;
  output?: string;
  status: "running" | "done" | "error";
}

export interface ThinkingPart {
  type: "thinking";
  content: string;
}

/** Reserved for future Runtime output. Rendering: placeholder. */
export interface ImagePart {
  type: "image";
  mimeType: string;
  data: string;
  alt?: string;
}

/** Reserved for future Runtime output. Rendering: placeholder. */
export interface FilePart {
  type: "file";
  fileName: string;
  mimeType: string;
  data: string;
  size?: number;
}

// ============================================================
// Message
// ============================================================

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  parts: MessagePart[];
  timestamp: number;
}

// ============================================================
// Session
// ============================================================

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// Workspace
// ============================================================

export interface Workspace {
  sessions: Session[];
  activeSessionId: string | null;
}

// ============================================================
// Agent Runtime Events — complete protocol
// ============================================================

export type AgentEvent =
  | AgentTextEvent
  | AgentCodeEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentThinkingEvent
  | AgentImageEvent
  | AgentFileEvent
  | AgentDoneEvent
  | AgentErrorEvent;

export interface AgentTextEvent {
  type: "text";
  content: string;
}

export interface AgentCodeEvent {
  type: "code";
  language: string;
  content: string;
}

export interface AgentToolCallEvent {
  type: "tool_call";
  toolName: string;
  input: unknown;
}

export interface AgentToolResultEvent {
  type: "tool_result";
  toolName: string;
  output: string;
}

export interface AgentThinkingEvent {
  type: "thinking";
  content: string;
}

export interface AgentImageEvent {
  type: "image";
  mimeType: string;
  data: string;
  alt?: string;
}

export interface AgentFileEvent {
  type: "file";
  fileName: string;
  mimeType: string;
  data: string;
  size?: number;
}

export interface AgentDoneEvent {
  type: "done";
}

export interface AgentErrorEvent {
  type: "error";
  error: string;
}

// ============================================================
// Agent Runtime Interface
// ============================================================

export interface IAgentRuntime {
  sendMessage(prompt: string): AsyncIterable<AgentEvent>;
  abort(): void;
}
