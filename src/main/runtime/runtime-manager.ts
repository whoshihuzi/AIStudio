import { ProcessAgentRuntime } from "./process-agent-runtime.js";
import { HermesAdapter } from "./hermes-adapter.js";
import type { AgentEvent } from "./types.js";

type AdapterId = "hermes";

const adapterRegistry: Record<AdapterId, () => ProcessAgentRuntime> = {
  hermes: () => new HermesAdapter(),
};

export class AgentRuntimeManager {
  private activeRuntime: ProcessAgentRuntime | null = null;

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
    runtimeState: Record<string, unknown>,
    onEvent: (event: AgentEvent) => void,
  ): Promise<void> {
    const runtime = this.getRuntime(adapter);
    runtime.setRuntimeState(runtimeState);
    await runtime.run(prompt, runtimeState, onEvent);
  }

  abort(): void {
    this.activeRuntime?.abort();
  }

  isRunning(): boolean {
    return this.activeRuntime?.isRunning() ?? false;
  }

  /** Export current adapter state for session persistence */
  getRuntimeState(): Record<string, unknown> {
    return this.activeRuntime?.getRuntimeState() ?? {};
  }

  listAdapters(): Array<{ id: AdapterId; name: string }> {
    return [{ id: "hermes", name: "Hermes" }];
  }
}

export const runtimeManager = new AgentRuntimeManager();
