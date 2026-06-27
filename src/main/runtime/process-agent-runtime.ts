import { spawn, type ChildProcess } from "child_process";
import { createInterface } from "readline";
import type { AgentEvent } from "./types.js";

// ============================================================
// ParseResult — returned by parseLine
// ============================================================

export interface ParseResult {
  events: AgentEvent[];
  /** Adapter can update its opaque state (e.g. capture sessionId) */
  runtimeStateUpdate?: Record<string, unknown>;
}

// ============================================================
// ProcessAgentRuntime — abstract base
// ============================================================

/**
 * Abstract base for any CLI-based agent runtime.
 *
 * Lifecycle: spawn → parse stdout lines → emit AgentEvent[] → process exits.
 *
 * Subclasses implement:
 *   - buildCommand(prompt, state): how to launch the CLI
 *   - parseLine(line, state):    pure function, interpret one stdout line
 *   - parseStderrLine(line, state): same for stderr
 */
export abstract class ProcessAgentRuntime {
  private proc: ChildProcess | null = null;
  private aborted = false;
  private running = false;

  /** Per-adapter opaque state (e.g. Hermes sessionId) */
  protected runtimeState: Record<string, unknown> = {};

  /** Human-readable adapter name */
  abstract readonly adapterName: string;

  // ---- Subclass hooks ----

  protected abstract buildCommand(
    prompt: string,
    state: Record<string, unknown>,
  ): { cmd: string; args: string[]; env?: Record<string, string> };

  protected parseLine(
    _line: string,
    _state: Record<string, unknown>,
  ): ParseResult {
    return { events: [{ type: "text", content: _line }] };
  }

  protected parseStderrLine(
    line: string,
    _state: Record<string, unknown>,
  ): ParseResult {
    if (!line.trim()) return { events: [] };
    return { events: [{ type: "error", error: line }] };
  }

  // ---- Public API ----

  async run(
    prompt: string,
    state: Record<string, unknown>,
    onEvent: (event: AgentEvent) => void,
  ): Promise<void> {
    if (this.running) {
      onEvent({ type: "error", error: "Agent is already running" });
      return;
    }

    this.aborted = false;
    this.running = true;

    const { cmd, args, env } = this.buildCommand(prompt, { ...state });

    this.proc = spawn(cmd, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdout = createInterface({ input: this.proc.stdout! });
    const stderr = createInterface({ input: this.proc.stderr! });

    stdout.on("line", (line: string) => {
      if (this.aborted) return;
      const result = this.parseLine(line, { ...this.runtimeState });
      if (result.runtimeStateUpdate) {
        Object.assign(this.runtimeState, result.runtimeStateUpdate);
      }
      for (const event of result.events) {
        onEvent(event);
      }
    });

    stderr.on("line", (line: string) => {
      if (this.aborted) return;
      const result = this.parseStderrLine(line, { ...this.runtimeState });
      if (result.runtimeStateUpdate) {
        Object.assign(this.runtimeState, result.runtimeStateUpdate);
      }
      for (const event of result.events) {
        onEvent(event);
      }
    });

    return new Promise<void>((resolve) => {
      this.proc!.on("close", () => {
        this.running = false;
        this.proc = null;
        if (!this.aborted) {
          onEvent({ type: "done" });
        }
        resolve();
      });

      this.proc!.on("error", (err) => {
        this.running = false;
        this.proc = null;
        onEvent({ type: "error", error: err.message });
        resolve();
      });
    });
  }

  abort(): void {
    this.aborted = true;
    if (this.proc) {
      this.proc.kill("SIGTERM");
      setTimeout(() => {
        if (this.proc && !this.proc.killed) {
          this.proc.kill("SIGKILL");
        }
      }, 3000);
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  /** Export current adapter state for session persistence */
  getRuntimeState(): Record<string, unknown> {
    return { ...this.runtimeState };
  }

  /** Restore adapter state from persisted session */
  setRuntimeState(state: Record<string, unknown>): void {
    this.runtimeState = { ...state };
  }
}
