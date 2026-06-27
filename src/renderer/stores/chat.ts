import { create } from "zustand";
import type { Message, MessagePart } from "@/runtime/types";
import { AgentBridge } from "@/runtime/agent-bridge";

// ============================================================
// Helpers
// ============================================================

let nextId = 1;
function uid(): string {
  return `msg_${nextId++}_${Date.now()}`;
}

function makeMessage(role: Message["role"], sessionId: string, parts: MessagePart[]): Message {
  return {
    id: uid(),
    sessionId,
    role,
    parts,
    timestamp: Date.now(),
  };
}

// ============================================================
// State
// ============================================================

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  sessionId: string;

  setSessionId: (id: string) => void;
  loadMessages: (msgs: Message[]) => void;
  sendMessage: (content: string) => Promise<void>;
  cancelRequest: () => void;
}

// ============================================================
// Store
// ============================================================

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  sessionId: "default",

  setSessionId: (id: string) => set({ sessionId: id, messages: [] }),

  loadMessages: (msgs: Message[]) => set({ messages: msgs }),

  sendMessage: async (content: string) => {
    const { messages } = get();
    const sessionId = get().sessionId;

    // Create runtime linked to this session (passes sessionId for --resume)
    const runtime = new AgentBridge(sessionId !== "default" ? sessionId : undefined);

    // Add user message
    const userMsg = makeMessage("user", sessionId, [{ type: "text", content }]);
    set({ messages: [...messages, userMsg], isLoading: true });

    // Create placeholder for assistant response
    const assistantMsg = makeMessage("assistant", sessionId, [{ type: "text", content: "" }]);
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

            const lastPart = parts[parts.length - 1];
            if (lastPart && lastPart.type === "text") {
              parts[parts.length - 1] = {
                ...lastPart,
                content: (lastPart.content || "") + event.content,
              };
            } else {
              parts.push({ type: "text", content: event.content });
            }

            updated[idx] = { ...msg, parts };
            set({ messages: updated });
            break;
          }
          case "code": {
            const updated = [...current];
            const msg = { ...updated[idx]! };
            updated[idx] = {
              ...msg,
              parts: [
                ...msg.parts,
                { type: "code", language: event.language, content: event.content },
              ],
            };
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
          case "thinking": {
            const updated = [...current];
            const msg = { ...updated[idx]! };
            const parts = [...msg.parts];
            const lastPart = parts[parts.length - 1];
            if (lastPart && lastPart.type === "thinking") {
              parts[parts.length - 1] = {
                ...lastPart,
                content: lastPart.content + event.content,
              };
            } else {
              parts.push({ type: "thinking", content: event.content });
            }
            updated[idx] = { ...msg, parts };
            set({ messages: updated });
            break;
          }
          case "image": {
            const updated = [...current];
            const msg = { ...updated[idx]! };
            updated[idx] = {
              ...msg,
              parts: [
                ...msg.parts,
                {
                  type: "image",
                  mimeType: event.mimeType,
                  data: event.data,
                  alt: event.alt,
                },
              ],
            };
            set({ messages: updated });
            break;
          }
          case "file": {
            const updated = [...current];
            const msg = { ...updated[idx]! };
            updated[idx] = {
              ...msg,
              parts: [
                ...msg.parts,
                {
                  type: "file",
                  fileName: event.fileName,
                  mimeType: event.mimeType,
                  data: event.data,
                  size: event.size,
                },
              ],
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
          parts: [...msg.parts, { type: "text", content: `Error: ${String(err)}` }],
        };
        set({ messages: updated });
      }
    } finally {
      set({ isLoading: false });
      runtime.destroy();
    }
  },

  cancelRequest: () => {
    // We need to reach the runtime to abort
    // For now, simple state change
    set({ isLoading: false });
  },
}));
