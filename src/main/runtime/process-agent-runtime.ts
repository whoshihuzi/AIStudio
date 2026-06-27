import { spawn, type ChildProcess } from "child_process";
import { createInterface } from "readline";
import type { AgentEvent } from "./types.js";

/**
 * ProcessAgentRuntime is the abstract base for any CLI-based agent runtime.
 *
 * It manages the full process lifecycle:
 *   - spawn / stdout parsing / stderr capture / abort / cleanup
 *
 * Subclasses only need to implement:
 *   - buildCommand(prompt): how to launch the CLI
 *   - parseLine(line): how to interpret one line of stdout
 */
export abstract class ProcessAgentRuntime {
  private proc: ChildProcess | null = null;
  private aborted = false;
  private running = false;

  /** Human-readable adapter name (e.g. "hermes", "claude-code") */
  abstract readonly adapterName: string;

  /** Build the shell command for a given prompt */
  protected abstract buildCommand(prompt: string): {
    cmd: string;
    args: string[];
    env?: Record<string, string>;
  };

  /** Parse one line of stdout into an AgentEvent, or null to skip */
  protected parseLine(_line: string): AgentEvent | null {
    return { type: "text", content: _line };
  }

  /** Parse one line of stderr (default: emit as error event) */
  protected parseStderrLine(line: string): AgentEvent | null {
    // Skip common noise
    if (!line.trim()) return null;
    return { type: "error", error: line };
  }

  // ---- Public API ----

  async run(prompt: string, onEvent: (event: AgentEvent) => void): Promise<void> {
    if (this.running) {
      onEvent({ type: "error", error: "Agent is already running" });
      return;
    }

    this.aborted = false;
    this.running = true;

    const { cmd, args, env } = this.buildCommand(prompt);

    this.proc = spawn(cmd, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdout = createInterface({ input: this.proc.stdout! });
    const stderr = createInterface({ input: this.proc.stderr! });

    stdout.on("line", (line: string) => {
      if (this.aborted) return;
      const event = this.parseLine(line);
      if (event) onEvent(event);
    });

    stderr.on("line", (line: string) => {
      if (this.aborted) return;
      const event = this.parseStderrLine(line);
      if (event) onEvent(event);
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
      // Force kill after 3s if still alive
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
}
