/**
 * SessionPersistence — lives OUTSIDE React component tree.
 *
 * Subscribes to Zustand chat store directly (no hooks).
 * Debounces saves by 2 seconds during active use.
 * On app-close signal from main process, flushes immediately.
 *
 * The Renderer's UI components (Sidebar, ChatView, etc.) never
 * touch session persistence — they only read/display data.
 */

import { useChatStore } from "./chat";
import { useSessionStore } from "./session";

const DEBOUNCE_MS = 2000;

class SessionPersistence {
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubChat: (() => void) | null = null;
  private unsubFlush: (() => void) | null = null;
  private started = false;

  // ----------------------------------------------------------
  // Lifecycle
  // ----------------------------------------------------------

  start(): void {
    if (this.started) return;
    this.started = true;

    // Watch Zustand chat store — fires on every set() call
    this.unsubChat = useChatStore.subscribe((state, prev) => {
      if (
        state.messages !== prev.messages &&
        state.sessionId !== "default" &&
        state.messages.length > 0
      ) {
        this.scheduleSave();
      }
    });

    // Listen for flush signal from main process (window close / app quit)
    this.unsubFlush = window.api.session.onFlushRequest(() => {
      void this.flush();
    });
  }

  stop(): void {
    this.started = false;
    this.unsubChat?.();
    this.unsubFlush?.();
    if (this.saveTimer) clearTimeout(this.saveTimer);
  }

  // ----------------------------------------------------------
  // Debounced save
  // ----------------------------------------------------------

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      void this.save();
    }, DEBOUNCE_MS);
  }

  // ----------------------------------------------------------
  // Save (idempotent — no-op if not dirty)
  // ----------------------------------------------------------

  private async save(): Promise<void> {
    if (!this.dirty) return;

    const chat = useChatStore.getState();
    const session = useSessionStore.getState();

    if (chat.sessionId === "default" || chat.messages.length === 0) {
      this.dirty = false;
      return;
    }

    try {
      await session.saveCurrentSession(chat.messages);
      this.dirty = false;
    } catch (err) {
      console.error("[SessionPersistence] save failed:", err);
      // Keep dirty=true so next attempt retries
    }
  }

  // ----------------------------------------------------------
  // Flush — force immediate save, signal main when done
  // ----------------------------------------------------------

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    await this.save();
    window.api.session.flushComplete();
  }
}

/** Singleton — start() once in main.tsx, live for the app lifetime. */
export const sessionPersistence = new SessionPersistence();
