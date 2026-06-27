// ============================================================
// Message Content Model
// ============================================================

/** A message is composed of one or more typed parts. */
export type MessagePart = TextPart | CodePart | ToolPart | ThinkingPart;

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
// Agent Runtime Events
// ============================================================

export type AgentEvent =
  | AgentTextEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentDoneEvent
  | AgentErrorEvent;

export interface AgentTextEvent {
  type: "text";
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
  /** Send a user message and receive a stream of agent events. */
  sendMessage(prompt: string): AsyncIterable<AgentEvent>;
  /** Request cancellation of the current operation. */
  abort(): void;
}
