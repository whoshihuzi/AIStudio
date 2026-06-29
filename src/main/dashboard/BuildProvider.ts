// ============================================================
// BuildProvider — runs npm typecheck and build checks.
// Internal implementation detail of the Main process.
// ============================================================

import { exec } from "child_process";
import type { BuildStatus } from "./types.js";

export class BuildProvider {
  // ----------------------------------------------------------
  // Run typecheck
  // ----------------------------------------------------------

  runTypecheck(): Promise<"pass" | "fail"> {
    return this.runCommand("npm run typecheck");
  }

  // ----------------------------------------------------------
  // Run build
  // ----------------------------------------------------------

  runBuild(): Promise<"pass" | "fail"> {
    return this.runCommand("npm run build");
  }

  // ----------------------------------------------------------
  // Internal
  // ----------------------------------------------------------

  private runCommand(command: string): Promise<"pass" | "fail"> {
    return new Promise((resolve) => {
      exec(command, { cwd: process.cwd(), timeout: 120_000 }, (err) => {
        resolve(err ? "fail" : "pass");
      });
    });
  }
}
