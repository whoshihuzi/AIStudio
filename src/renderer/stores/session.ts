import { create } from "zustand";
import type { Message } from "@/runtime/types";

// Re-export preload session types from env.d.ts
export interface SessionMeta {
  id: string;
  title: string;
  runtime: string;
  adapter: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionState {
  sessions: SessionMeta[];
  activeSessionId: string | null;
  loading: boolean;

  init: () => Promise<void>;
  createSession: () => Promise<SessionMeta>;
  switchSession: (id: string) => Promise<void>;
  saveCurrentSession: (messages: Message[]) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,

  init: async () => {
    set({ loading: true });
    const sessions = await window.api.session.list();
    if (sessions.length > 0) {
      set({ sessions, activeSessionId: sessions[0]!.id, loading: false });
      // Load first session's messages
      const data = await window.api.session.load(sessions[0]!.id);
      if (data) {
        const { useChatStore } = await import("@/stores/chat");
        useChatStore.getState().setSessionId(sessions[0]!.id);
        useChatStore.getState().loadMessages(
          data.messages.map((m) => ({
            id: m.id,
            sessionId: data.meta.id,
            role: m.role,
            parts: m.parts.map((p) => ({ ...p } as Message["parts"][number])),
            timestamp: m.timestamp,
          })),
        );
      }
    }
    set({ loading: false });
  },

  createSession: async () => {
    const meta = await window.api.session.create();
    set((s) => ({
      sessions: [meta, ...s.sessions],
      activeSessionId: meta.id,
    }));
    const { useChatStore } = await import("@/stores/chat");
    useChatStore.getState().setSessionId(meta.id);
    useChatStore.getState().loadMessages([]);
    return meta;
  },

  switchSession: async (id: string) => {
    // Save current session first
    const { useChatStore } = await import("@/stores/chat");
    const current = useChatStore.getState();
    if (current.sessionId !== "default" && current.messages.length > 0) {
      await get().saveCurrentSession(current.messages);
    }

    // Load target session
    const data = await window.api.session.load(id);
    if (data) {
      useChatStore.getState().setSessionId(id);
      useChatStore.getState().loadMessages(
        data.messages.map((m) => ({
          id: m.id,
          sessionId: data.meta.id,
          role: m.role,
          parts: m.parts.map((p) => ({ ...p } as Message["parts"][number])),
          timestamp: m.timestamp,
        })),
      );
      set({ activeSessionId: id });
    }
  },

  saveCurrentSession: async (messages: Message[]) => {
    const id = get().activeSessionId;
    if (!id || id === "default") return;

    const meta = get().sessions.find((s) => s.id === id);
    if (!meta) return;

    await window.api.session.save({
      meta: { ...meta, updatedAt: Date.now() },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: m.parts.map((p) => ({ ...p })) as any,
        timestamp: m.timestamp,
      })),
    });
  },

  deleteSession: async (id: string) => {
    await window.api.session.delete(id);

    const { useChatStore } = await import("@/stores/chat");
    const wasCurrent = get().activeSessionId === id;

    set((s) => {
      const sessions = s.sessions.filter((x) => x.id !== id);
      const activeSessionId =
        s.activeSessionId === id
          ? (sessions[0]?.id ?? null)
          : s.activeSessionId;
      return { sessions, activeSessionId };
    });

    if (wasCurrent) {
      const newActiveId = get().activeSessionId;
      if (newActiveId) {
        // Switch to next session
        const data = await window.api.session.load(newActiveId);
        if (data) {
          useChatStore.getState().setSessionId(newActiveId);
          useChatStore.getState().loadMessages(
            data.messages.map((m) => ({
              id: m.id,
              sessionId: data.meta.id,
              role: m.role,
              parts: m.parts.map((p) => ({ ...p } as Message["parts"][number])),
              timestamp: m.timestamp,
            })),
          );
        }
      } else {
        // No sessions left — reset to default
        useChatStore.getState().setSessionId("default");
        useChatStore.getState().loadMessages([]);
      }
    }
  },
}));
