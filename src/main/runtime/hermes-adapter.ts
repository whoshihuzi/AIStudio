import stripAnsi from "strip-ansi";
import { ProcessAgentRuntime, type ParseResult } from "./process-agent-runtime.js";
import type { AgentEvent } from "./types.js";

/**
 * HermesAdapter — thin adapter for Hermes Agent CLI.
 *
 * Protocol: hermes chat --cli -q "prompt" [--resume <sessionId>]
 *
 * Responsibilities:
 *   - buildCommand: include --resume when sessionId is in runtimeState
 *   - parseLine: strip ANSI → filter chrome → extract text/tool events
 */
export class HermesAdapter extends ProcessAgentRuntime {
  readonly adapterName = "hermes";

  protected buildCommand(prompt: string, state: Record<string, unknown>): {
    cmd: string;
    args: string[];
  } {
    const args = ["chat", "--cli", "-q", prompt];
    if (state.sessionId) args.push("--resume", state.sessionId as string);
    return { cmd: "hermes", args };
  }

  protected parseLine(line: string, state: Record<string, unknown>): ParseResult {
    // ── 0. Strip ANSI escape codes ──
    const clean = stripAnsi(line).trimEnd();
    const trimmed = clean.trim();
    if (!trimmed) return { events: [] };

    // ── 1. Session ID capture ──
    const sessionMatch = trimmed.match(/hermes --resume (\S+)/);
    if (sessionMatch && sessionMatch[1]) {
      return {
        events: [],
        runtimeStateUpdate: { sessionId: sessionMatch[1] },
      };
    }

    // ── 2. Chrome (always skip) ──
    if (isChrome(trimmed)) return { events: [] };

    // ── 3. Response block borders (skip, not content) ──
    if (trimmed.startsWith("╭─") || trimmed.startsWith("╰─")) {
      return { events: [] };
    }

    // ── 4. Tool call ──
    const prepMatch = trimmed.match(/preparing\s+(\S+)…/);
    if (prepMatch) {
      const toolName = prepMatch[1]!;
      return {
        events: [{ type: "tool_call", toolName, input: {} }],
        runtimeStateUpdate: { pendingTool: toolName },
      };
    }

    // ── 5. Tool result ──
    if (trimmed.includes("┊")) {
      const pending = (state.pendingTool as string) || "unknown";
      return {
        events: [{ type: "tool_result", toolName: pending, output: trimmed }],
        runtimeStateUpdate: { pendingTool: null },
      };
    }

    // ── 6. Content text ──
    return { events: [{ type: "text", content: trimmed }] };
  }

  protected parseStderrLine(line: string, _state: Record<string, unknown>): ParseResult {
    const clean = stripAnsi(line).trim();
    if (!clean) return { events: [] };
    if (clean.includes("Error") || clean.includes("Traceback")) {
      return { events: [{ type: "error", error: clean }] };
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
    /^─{2,}/.test(line) ||           // ──── separator lines
    line.startsWith("Resume this") ||
    line.startsWith("Session:") ||
    line.startsWith("Duration:") ||
    line.startsWith("Messages:") ||
    /^hermes --resume/.test(line)
  );
}
