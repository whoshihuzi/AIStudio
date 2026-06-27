import { ProcessAgentRuntime } from "./process-agent-runtime.js";
import type { AgentEvent } from "./types.js";

/**
 * HermesAdapter — thin adapter for Hermes Agent CLI.
 *
 * Responsibilities:
 *   - Define how to invoke Hermes
 *   - Parse Hermes output into AgentEvents
 *
 * Lifecycle (spawn, abort, cleanup) is handled by ProcessAgentRuntime.
 */
export class HermesAdapter extends ProcessAgentRuntime {
  readonly adapterName = "hermes";

  protected buildCommand(prompt: string): {
    cmd: string;
    args: string[];
  } {
    return {
      cmd: "hermes",
      args: ["-z", prompt],
    };
  }

  /**
   * Hermes -z mode outputs plain text lines.
   * Every non-empty line is a text event.
   */
  protected parseLine(line: string): AgentEvent[] {
    const trimmed = line.trim();
    if (!trimmed) return [];
    return [{ type: "text", content: trimmed }];
  }

  protected parseStderrLine(line: string): AgentEvent[] {
    const trimmed = line.trim();
    if (!trimmed) return [];
    if (trimmed.includes("Error") || trimmed.includes("Traceback")) {
      return [{ type: "error", error: trimmed }];
    }
    return [];
  }
}
