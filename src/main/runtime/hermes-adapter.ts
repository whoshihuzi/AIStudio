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
  protected parseLine(line: string): AgentEvent | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    return { type: "text", content: trimmed };
  }

  /**
   * Hermes may output diagnostic info to stderr.
   * Only emit error events for actual errors (lines containing "Error" or "Traceback").
   */
  protected parseStderrLine(line: string): AgentEvent | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (trimmed.includes("Error") || trimmed.includes("Traceback")) {
      return { type: "error", error: trimmed };
    }
    return null;
  }
}
