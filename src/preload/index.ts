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

    /** Main process signals "about to quit — flush now". */
    onFlushRequest: (callback: () => void): (() => void) => {
      const handler = (): void => callback();
      ipcRenderer.on("session:flush-request", handler);
      return () => {
        ipcRenderer.removeListener("session:flush-request", handler);
      };
    },

    /** Renderer signals "flush done — you can close now". */
    flushComplete: (): void => {
      ipcRenderer.send("session:flush-complete");
    },
  },

  dashboard: {
    getData: (): Promise<unknown> =>
      ipcRenderer.invoke("dashboard:get-data"),
    runChecks: (): Promise<unknown> =>
      ipcRenderer.invoke("dashboard:run-checks"),
  },

  project: {
    getInfo: (): Promise<unknown> =>
      ipcRenderer.invoke("project:get-info"),
  },

  brain: {
    getData: (): Promise<unknown> =>
      ipcRenderer.invoke("brain:get-data"),
  },

  workspace: {
    list: (path: string): Promise<unknown> =>
      ipcRenderer.invoke("workspace:list", path),
    stat: (path: string): Promise<unknown> =>
      ipcRenderer.invoke("workspace:stat", path),
    read: (path: string): Promise<unknown> =>
      ipcRenderer.invoke("workspace:read", path),
    exists: (path: string): Promise<boolean> =>
      ipcRenderer.invoke("workspace:exists", path),
    write: (path: string, content: string): Promise<void> =>
      ipcRenderer.invoke("workspace:write", path, content),
    rename: (from: string, to: string): Promise<void> =>
      ipcRenderer.invoke("workspace:rename", from, to),
    mkdir: (path: string): Promise<void> =>
      ipcRenderer.invoke("workspace:mkdir", path),
    delete: (path: string): Promise<void> =>
      ipcRenderer.invoke("workspace:delete", path),
    copy: (from: string, to: string): Promise<void> =>
      ipcRenderer.invoke("workspace:copy", from, to),
    move: (from: string, to: string): Promise<void> =>
      ipcRenderer.invoke("workspace:move", from, to),
  },

  config: {
    get: (key: string): Promise<unknown> =>
      ipcRenderer.invoke("config:get", key),
    set: (key: string, value: unknown): Promise<void> =>
      ipcRenderer.invoke("config:set", key, value),
    onLanguageChange: (callback: (locale: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, locale: string): void =>
        callback(locale);
      ipcRenderer.on("config:language-changed", handler);
      return () => {
        ipcRenderer.removeListener("config:language-changed", handler);
      };
    },
  },

  command: {
    execute: (id: string, args?: Record<string, unknown>): Promise<unknown> =>
      ipcRenderer.invoke("command:execute", id, args),
  },
});
