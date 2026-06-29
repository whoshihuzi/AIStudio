import type { IAgentRuntime, AgentEvent } from "./types";

/**
 * AgentBridge connects the Renderer to the main-process runtime via IPC.
 * The Renderer never knows which adapter (Hermes, Claude, etc.) is running.
 *
 * Stable API:
 *   - sendMessage(prompt): fires IPC, agent starts processing
 *   - abort(): sends abort signal
 *   - Events arrive asynchronously via the preload callback
 */
export class AgentBridge implements IAgentRuntime {
  private unsubscribers: Array<() => void> = [];
  private eventQueue: AgentEvent[] = [];
  private resolveNext: ((event: AgentEvent) => void) | null = null;
  private done = false;
  private sessionId: string | undefined;

  constructor(sessionId?: string) {
    this.sessionId = sessionId;
    const unsub = window.api.agent.onEvent((rawEvent) => {
      const event = rawEvent as AgentEvent;
      if (this.resolveNext) {
        this.resolveNext(event);
        this.resolveNext = null;
      } else {
        this.eventQueue.push(event);
      }
      if (event.type === "done" || event.type === "error") {
        this.done = true;
      }
    });
    this.unsubscribers.push(unsub);
  }

  async *sendMessage(prompt: string): AsyncIterable<AgentEvent> {
    this.done = false;
    this.eventQueue = [];

    // Fire IPC — main process will start streaming events back
    window.api.agent.send(prompt, this.sessionId);

    while (!this.done) {
      if (this.eventQueue.length > 0) {
        yield this.eventQueue.shift()!;
      } else {
        yield await new Promise<AgentEvent>((resolve) => {
          this.resolveNext = resolve;
        });
      }
    }

    // Drain remaining events
    while (this.eventQueue.length > 0) {
      yield this.eventQueue.shift()!;
    }
  }

  abort(): void {
    window.api.agent.abort();
    this.done = true;
  }

  destroy(): void {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
  }
}
