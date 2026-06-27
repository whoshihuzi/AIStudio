import { contextBridge, ipcRenderer } from "electron";

/**
 * Stable preload API.
 *
 * Design rules:
 *   - No adapter names ("hermes") appear here
 *   - API surface is intentionally small: send / abort / onEvent / subscribe
 *   - Future agents (Claude, GPT) reuse the same API
 */

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

contextBridge.exposeInMainWorld("api", {
  agent: {
    send: (prompt: string, sessionId?: string) =>
      ipcRenderer.send("agent:send", prompt, sessionId),
    abort: () => ipcRenderer.send("agent:abort"),
    onEvent: (callback: (event: AgentEvent) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: AgentEvent) =>
        callback(data);
      ipcRenderer.on("agent:event", handler);
      return () => {
        ipcRenderer.removeListener("agent:event", handler);
      };
    },
  },

  session: {
    create: (adapter: string): Promise<SessionMeta> =>
      ipcRenderer.invoke("session:create", adapter),
    list: (): Promise<SessionMeta[]> => ipcRenderer.invoke("session:list"),
    load: (id: string): Promise<SessionData | null> =>
      ipcRenderer.invoke("session:load", id),
    save: (data: SessionData): Promise<void> =>
      ipcRenderer.invoke("session:save", data),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke("session:delete", id),
  },
});
