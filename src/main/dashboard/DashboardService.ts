// ============================================================
// DashboardService — single public entry point for Dashboard data.
// ============================================================

import { GitProvider } from "./GitProvider.js";
import { TodoProvider } from "./TodoProvider.js";
import { SessionProvider } from "./SessionProvider.js";
import { BuildProvider } from "./BuildProvider.js";
import { ValidationProvider } from "./ValidationProvider.js";
import { ProjectInfoProvider } from "./ProjectInfoProvider.js";
import { BrainProvider } from "./BrainProvider.js";
import type {
  DashboardRawData, BuildStatus, ValidationReport,
  ProjectInfo, ActivityState, BrainData,
} from "./types.js";

export class DashboardService {
  private readonly git = new GitProvider();
  private readonly todo = new TodoProvider();
  private readonly session = new SessionProvider();
  private readonly build = new BuildProvider();
  private readonly validator = new ValidationProvider();
  private readonly projectInfo = new ProjectInfoProvider();
  private readonly brain = new BrainProvider();

  // ----------------------------------------------------------
  // Activity state (shared across all async operations)
  // ----------------------------------------------------------

  private _activity: ActivityState = "idle";

  get activity(): ActivityState {
    return this._activity;
  }

  private setActivity(state: ActivityState): void {
    this._activity = state;
  }

  // ----------------------------------------------------------
  // Project Identity
  // ----------------------------------------------------------

  getProjectInfo(): ProjectInfo {
    this.projectInfo.ensureMetadata();
    return this.projectInfo.getProjectInfo();
  }

  // ----------------------------------------------------------
  // Project Brain
  // ----------------------------------------------------------

  getBrainData(): BrainData {
    this.brain.ensureSeeded();
    return this.brain.getBrainData();
  }

  // ----------------------------------------------------------
  // Get full snapshot
  // ----------------------------------------------------------

  async getData(): Promise<DashboardRawData> {
    this.setActivity("refreshing");
    try {
      const milestone = this.todo.getMilestoneProgress();

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

      if (isDevMode()) {
        this.runValidation(data);
      }

      return data;
    } finally {
      if (this._activity === "refreshing") {
        this.setActivity("idle");
      }
    }
  }

  // ----------------------------------------------------------
  // Build checks
  // ----------------------------------------------------------

  async runChecks(): Promise<BuildStatus> {
    this.setActivity("running-checks");
    try {
      this.setActivity("typechecking");
      const typecheck = await this.build.runTypecheck();
      this.setActivity("building");
      const build = await this.build.runBuild();
      return { typecheck, build };
    } finally {
      this.setActivity("idle");
    }
  }

  // ----------------------------------------------------------
  // Validation
  // ----------------------------------------------------------

  private runValidation(data: DashboardRawData): void {
    try {
      const report = this.validator.validate(data);
      this.logReport(report);
    } catch (err) {
      console.warn("[DashboardService] validation crashed:", err);
    }
  }

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
}

function isDevMode(): boolean {
  return (
    !!process.env["VITE_DEV_SERVER_URL"] ||
    process.env["NODE_ENV"] === "development"
  );
}

export const dashboardService = new DashboardService();
