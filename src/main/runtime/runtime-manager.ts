import { ProcessAgentRuntime } from "./process-agent-runtime.js";
import { HermesAdapter } from "./hermes-adapter.js";
import { ContextBuilder } from "../context/ContextBuilder.js";
import type { AgentEvent } from "./types.js";

type AdapterId = "hermes";

const adapterRegistry: Record<AdapterId, () => ProcessAgentRuntime> = {
  hermes: () => new HermesAdapter(),
};

/** Default token budget for context injection. */
const DEFAULT_CONTEXT_BUDGET = 4000;

export class AgentRuntimeManager {
  private activeRuntime: ProcessAgentRuntime | null = null;
  private readonly contextBuilder = new ContextBuilder();

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
    // ── Context Injection ──
    const ctx = this.contextBuilder.build({
      tokenBudget: DEFAULT_CONTEXT_BUDGET,
      userPrompt: prompt,
    });

    console.log(
      `[RuntimeManager] context: ${ctx.sectionCount} sections, ` +
      `~${ctx.tokenEstimate} tokens` +
      (ctx.trimmedSections > 0 ? `, ${ctx.trimmedSections} trimmed` : ""),
    );

    // ── Run adapter with augmented prompt ──
    const runtime = this.getRuntime(adapter);
    runtime.setRuntimeState(runtimeState);
    await runtime.run(ctx.augmentedPrompt, runtimeState, onEvent);
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
