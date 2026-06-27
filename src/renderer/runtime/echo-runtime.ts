import type { IAgentRuntime, AgentEvent } from "./types";

/**
 * EchoRuntime is a stub implementation of IAgentRuntime.
 * It echoes back user messages as text events.
 * This will be replaced by ProcessAgentRuntime in M4.
 */
export class EchoRuntime implements IAgentRuntime {
  private aborted = false;

  async *sendMessage(prompt: string): AsyncIterable<AgentEvent> {
    this.aborted = false;

    // Simulate a brief processing delay
    await new Promise((r) => setTimeout(r, 300));

    if (this.aborted) {
      yield { type: "done" };
      return;
    }

    yield { type: "text", content: `Echo: ${prompt}` };
    yield { type: "done" };
  }

  abort(): void {
    this.aborted = true;
  }
}
