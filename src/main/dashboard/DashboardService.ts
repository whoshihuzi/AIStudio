// ============================================================
// DashboardService — single public entry point for Dashboard data.
//
// Assembles data from independent providers. The Renderer never
// knows which provider produced each piece — it only sees the
// assembled DashboardRawData.
// ============================================================

import { GitProvider } from "./GitProvider.js";
import { TodoProvider } from "./TodoProvider.js";
import { SessionProvider } from "./SessionProvider.js";
import { BuildProvider } from "./BuildProvider.js";
import { ValidationProvider } from "./ValidationProvider.js";
import type { DashboardRawData, BuildStatus, ValidationReport } from "./types.js";

export class DashboardService {
  private readonly git = new GitProvider();
  private readonly todo = new TodoProvider();
  private readonly session = new SessionProvider();
  private readonly build = new BuildProvider();
  private readonly validator = new ValidationProvider();

  // ----------------------------------------------------------
  // Get full snapshot (fast — git + docs + sessions)
  // ----------------------------------------------------------

  async getData(): Promise<DashboardRawData> {
    const milestone = this.todo.getMilestoneProgress();

    // Merge Git data into milestone
    if (milestone) {
      milestone.baseline = this.git.getBaseline();
      milestone.branch = this.git.getBranch();
      milestone.headCommit = this.git.getHeadCommit();
    }

    const data: DashboardRawData = {
      milestone,
      workingTree: this.git.getWorkingTree(),
      nextActions: this.todo.getNextActions(),
      recent: {
        commits: this.git.getRecentCommits(5),
        sessions: this.session.getRecentSessions(3),
      },
    };

    // In dev mode, validate every piece of data against its source
    if (isDevMode()) {
      this.runValidation(data);
    }

    return data;
  }

  // ----------------------------------------------------------
  // Validation (dev-mode only, never exposed to Renderer)
  // ----------------------------------------------------------

  private runValidation(data: DashboardRawData): void {
    try {
      const report = this.validator.validate(data);
      this.logReport(report);
    } catch (err) {
      console.warn("[DashboardService] validation crashed:", err);
    }
  }

  /** Log a compact summary to main-process console. */
  private logReport(report: ValidationReport): void {
    const icon = report.failed === 0 ? "✓" : "✗";
    console.log(
      `[DashboardService] Validation ${icon}  ` +
      `${report.passed}/${report.total} passed` +
      (report.failed > 0 ? `, ${report.failed} FAILED` : "") +
      (report.warnings > 0 ? `, ${report.warnings} warnings` : ""),
    );

    if (report.failed > 0) {
      for (const e of report.entries) {
        if (e.status === "fail") {
          console.warn(`  ✗ ${e.field}: ${e.message}`);
        }
      }
    }
  }

  // ----------------------------------------------------------
  // Run quality checks (slow — spawns npm processes)
  // ----------------------------------------------------------

  async runChecks(): Promise<BuildStatus> {
    const [typecheck, build] = await Promise.all([
      this.build.runTypecheck(),
      this.build.runBuild(),
    ]);
    return { typecheck, build };
  }
}

// ----------------------------------------------------------
// Dev mode detection
// ----------------------------------------------------------

function isDevMode(): boolean {
  return (
    !!process.env["VITE_DEV_SERVER_URL"] ||
    process.env["NODE_ENV"] === "development"
  );
}

/** Singleton for IPC handlers. */
export const dashboardService = new DashboardService();
