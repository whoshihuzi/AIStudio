import { ProcessAgentRuntime } from "./process-agent-runtime.js";
import { HermesAdapter } from "./hermes-adapter.js";
import type { AgentEvent } from "./types.js";

/**
 * AgentRuntimeManager owns the active runtime instance.
 * The main process should NOT import individual adapters directly —
 * it only talks to RuntimeManager.
 */

type AdapterId = "hermes";

const adapterRegistry: Record<AdapterId, () => ProcessAgentRuntime> = {
  hermes: () => new HermesAdapter(),
};

export class AgentRuntimeManager {
  private activeRuntime: ProcessAgentRuntime | null = null;

  /** Get or create a runtime for the given adapter */
  private getRuntime(adapter: AdapterId): ProcessAgentRuntime {
    if (!this.activeRuntime) {
      const factory = adapterRegistry[adapter];
      if (!factory) throw new Error(`Unknown adapter: ${adapter}`);
      this.activeRuntime = factory();
    }
    return this.activeRuntime;
  }

  async run(
    adapter: AdapterId,
    prompt: string,
    onEvent: (event: AgentEvent) => void,
  ): Promise<void> {
    const runtime = this.getRuntime(adapter);
    await runtime.run(prompt, onEvent);
  }

  abort(): void {
    this.activeRuntime?.abort();
  }

  isRunning(): boolean {
    return this.activeRuntime?.isRunning() ?? false;
  }

  /** List available adapters (for future UI display) */
  listAdapters(): Array<{ id: AdapterId; name: string }> {
    return [{ id: "hermes", name: "Hermes" }];
  }
}

/** Singleton */
export const runtimeManager = new AgentRuntimeManager();
