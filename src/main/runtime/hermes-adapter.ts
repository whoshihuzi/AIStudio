import { ProcessAgentRuntime, type ParseResult } from "./process-agent-runtime.js";
import type { AgentEvent } from "./types.js";

/**
 * HermesAdapter — thin adapter for Hermes Agent CLI.
 *
 * Protocol: hermes chat --cli -q "prompt" [--resume <sessionId>]
 *
 * Responsibilities:
 *   - buildCommand: include --resume when sessionId is in runtimeState
 *   - parseLine: filter chrome, extract text/tool events, capture sessionId
 */
export class HermesAdapter extends ProcessAgentRuntime {
  readonly adapterName = "hermes";

  protected buildCommand(prompt: string, state: Record<string, unknown>): {
    cmd: string;
    args: string[];
  } {
    const args = ["chat", "--cli", "-q", prompt];

    if (state.sessionId) {
      args.push("--resume", state.sessionId as string);
    }

    return { cmd: "hermes", args };
  }

  protected parseLine(line: string, state: Record<string, unknown>): ParseResult {
    const raw = line.trimEnd();
    const trimmed = raw.trim();

    // ── empty ──
    if (!trimmed) return { events: [] };

    // ── sessionId capture (from "hermes --resume <id>" line) ──
    const sessionMatch = trimmed.match(/hermes --resume (\S+)/);
    if (sessionMatch && sessionMatch[1]) {
      return {
        events: [],
        runtimeStateUpdate: { sessionId: sessionMatch[1] },
      };
    }

    // ── Chrome lines (skip) ──
    if (isChrome(trimmed)) return { events: [] };

    // ── Response block boundaries (skip) ──
    if (trimmed.startsWith("╭─") || trimmed.startsWith("╰─")) {
      return { events: [] };
    }

    // ── Tool call: "preparing <toolName>…" ──
    const prepMatch = trimmed.match(/preparing\s+(\S+)…/);
    if (prepMatch) {
      const toolName = prepMatch[1]!;
      return {
        events: [{ type: "tool_call", toolName, input: {} }],
        runtimeStateUpdate: { pendingTool: toolName },
      };
    }

    // ── Tool result: contains ┊ but not "preparing" ──
    if (trimmed.includes("┊")) {
      const pending = (state.pendingTool as string) || "unknown";
      return {
        events: [{ type: "tool_result", toolName: pending, output: trimmed }],
        runtimeStateUpdate: { pendingTool: null },
      };
    }

    // ── Content text ──
    return { events: [{ type: "text", content: trimmed }] };
  }

  protected parseStderrLine(
    line: string,
    _state: Record<string, unknown>,
  ): ParseResult {
    const trimmed = line.trim();
    if (!trimmed) return { events: [] };
    // Only emit real errors, not TUI noise
    if (trimmed.includes("Error") || trimmed.includes("Traceback")) {
      return { events: [{ type: "error", error: trimmed }] };
    }
    return { events: [] };
  }
}

// ── Chrome filter ──

function isChrome(line: string): boolean {
  return (
    line.startsWith("Query:") ||
    line.startsWith("Initializing") ||
    line.startsWith("↻ Resumed") ||
    line.startsWith("────") ||
    line.startsWith("Resume this") ||
    line.startsWith("Session:") ||
    line.startsWith("Duration:") ||
    line.startsWith("Messages:") ||
    /^hermes --resume/.test(line)
  );
}
