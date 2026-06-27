/// <reference types="vite/client" />

declare module "*.css" {}

// Preload API exposed via contextBridge
interface Window {
  api: {
    agent: {
      send: (prompt: string, sessionId?: string) => void;
      abort: () => void;
      onEvent: (
        callback: (event: {
          type: string;
          content?: string;
          toolName?: string;
          input?: unknown;
          output?: string;
          error?: string;
        }) => void,
      ) => () => void;
    };
    session: {
      create: (adapter: string) => Promise<{
        id: string;
        title: string;
        runtime: string;
        adapter: string;
        createdAt: number;
        updatedAt: number;
      }>;
      list: () => Promise<
        Array<{
          id: string;
          title: string;
          runtime: string;
          adapter: string;
          createdAt: number;
          updatedAt: number;
        }>
      >;
      load: (id: string) => Promise<{
        meta: {
          id: string;
          title: string;
          runtime: string;
          adapter: string;
          createdAt: number;
          updatedAt: number;
        };
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
      } | null>;
      save: (data: {
        meta: {
          id: string;
          title: string;
          runtime: string;
          adapter: string;
          createdAt: number;
          updatedAt: number;
        };
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
      }) => Promise<void>;
      delete: (id: string) => Promise<void>;
      /** Main → Renderer: "about to quit, flush now" */
      onFlushRequest: (callback: () => void) => () => void;
      /** Renderer → Main: "flush done, you can close" */
      flushComplete: () => void;
    };
  };
}
