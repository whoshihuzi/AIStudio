import { create } from "zustand";
import type { Message, MessagePart, IAgentRuntime, AgentEvent } from "@/runtime/types";
import { EchoRuntime } from "@/runtime/echo-runtime";

// ============================================================
// Helpers
// ============================================================

let nextId = 1;
function uid(): string {
  return `msg_${nextId++}_${Date.now()}`;
}

// ============================================================
// State
// ============================================================

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  runtime: IAgentRuntime;

  sendMessage: (content: string) => Promise<void>;
  cancelRequest: () => void;
  clearMessages: () => void;
}

// ============================================================
// Store
// ============================================================

const defaultSessionId = "session_default";

function makeMessage(role: Message["role"], parts: MessagePart[]): Message {
  return {
    id: uid(),
    sessionId: defaultSessionId,
    role,
    parts,
    timestamp: Date.now(),
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  runtime: new EchoRuntime(),

  sendMessage: async (content: string) => {
    const { runtime, messages } = get();

    // Add user message
    const userMsg = makeMessage("user", [{ type: "text", content }]);
    set({ messages: [...messages, userMsg], isLoading: true });

    // Create placeholder for assistant response
    const assistantMsg = makeMessage("assistant", [{ type: "text", content: "" }]);
    set({ messages: [...get().messages, assistantMsg] });

    try {
      for await (const event of runtime.sendMessage(content)) {
        const current = get().messages;
        const idx = current.findIndex((m) => m.id === assistantMsg.id);

        if (idx === -1) continue;

        switch (event.type) {
          case "text": {
            const updated = [...current];
            const msg = { ...updated[idx]! };
            const parts = [...msg.parts];

            // Append to the last text part or create a new one
            const lastPart = parts[parts.length - 1];
            if (lastPart && lastPart.type === "text") {
              parts[parts.length - 1] = {
                ...lastPart,
                content: lastPart.content + event.content,
              };
            } else {
              parts.push({ type: "text", content: event.content });
            }

            updated[idx] = { ...msg, parts };
            set({ messages: updated });
            break;
          }
          case "tool_call": {
            const updated = [...current];
            const msg = { ...updated[idx]! };
            updated[idx] = {
              ...msg,
              parts: [
                ...msg.parts,
                {
                  type: "tool",
                  toolName: event.toolName,
                  input: event.input,
                  status: "running",
                } as const,
              ],
            };
            set({ messages: updated });
            break;
          }
          case "tool_result": {
            const updated = [...current];
            const msg = { ...updated[idx]! };
            const parts = msg.parts.map((p) =>
              p.type === "tool" && p.toolName === event.toolName
                ? { ...p, output: event.output, status: "done" as const }
                : p,
            );
            updated[idx] = { ...msg, parts };
            set({ messages: updated });
            break;
          }
          case "error": {
            const updated = [...current];
            const msg = { ...updated[idx]! };
            updated[idx] = {
              ...msg,
              parts: [...msg.parts, { type: "text", content: `Error: ${event.error}` }],
            };
            set({ messages: updated });
            break;
          }
          case "done":
            break;
        }
      }
    } catch (err) {
      const current = get().messages;
      const idx = current.findIndex((m) => m.id === assistantMsg.id);
      if (idx !== -1) {
        const updated = [...current];
        const msg = { ...updated[idx]! };
        updated[idx] = {
          ...msg,
          parts: [
            ...msg.parts,
            { type: "text", content: `Error: ${String(err)}` },
          ],
        };
        set({ messages: updated });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  cancelRequest: () => {
    get().runtime.abort();
    set({ isLoading: false });
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
