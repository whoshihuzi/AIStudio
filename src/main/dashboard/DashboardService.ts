// ============================================================
// DashboardService — single public entry point for Dashboard data.
//
// M12.6.6: added getProjectState() — composes ALL Dashboard data
// into ONE ProjectState object. Dashboard renders from this single
// object instead of assembling multiple unrelated values.
// No new Provider. No new IPC.
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
  ProjectInfo, ActivityState, BrainData, ProjectState,
  ProjectStatus, RecommendationType, CurrentTask,
  WorkingTree, MilestoneProgress,
  WorkspaceIndexSnapshot,
} from "./types.js";
import type { IndexStats } from "../workspace/WorkspaceIndexer.js";
import type { DevelopmentState } from "../../shared/development/types.js";
import { DevelopmentIntelligenceService } from "../development/DevelopmentIntelligenceService.js";
import { toProjectActivity } from "../development/ProjectActivity.js";
import type { ProviderData } from "../development/types.js";

export class DashboardService {
  private readonly git = new GitProvider();
  private readonly todo = new TodoProvider();
  private readonly session = new SessionProvider();
  private readonly build = new BuildProvider();
  private readonly validator = new ValidationProvider();
  private readonly projectInfo = new ProjectInfoProvider();
  private readonly brain = new BrainProvider();
  private readonly devIntel = new DevelopmentIntelligenceService(process.cwd());

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
  // ProjectState — single unified Dashboard payload (M12.6.6)
  //
  // Composed from existing providers internally. No new
  // Provider class. No new IPC channel. The Dashboard renders
  // from ONE object.
  // ----------------------------------------------------------

  async getProjectState(indexStats?: IndexStats | null): Promise<ProjectState> {
    this.setActivity("refreshing");
    try {
      // Working tree (needed for status computation)
      const workingTree = this.git.getWorkingTree();

      // Build status is cheap (reads from last run, not actual exec)
      const buildStatus: BuildStatus = { typecheck: "unknown", build: "unknown" };

      // Milestone from TODO.md + Git enrichment
      const milestone = this.todo.getMilestoneProgress();
      if (milestone) {
        const baseline = this.git.getBaseline();
        milestone.baseline = {
          ...baseline,
          lastCommitTime: this.git.getLastCommitTime(),
        };
        milestone.branch = this.git.getBranch();
        milestone.headCommit = this.git.getHeadCommit();
      }

      // Brain data (auto-syncs current-focus.json from TODO.md)
      this.brain.ensureSeeded();
      const brainData = this.brain.getBrainData();

      // Current task: first unchecked task from the milestone (M12.7)
      const currentTask = this.computeCurrentTask(milestone, brainData);

      // Pre-compute status (widgets render, never derive)
      const status = this.computeStatus(workingTree, milestone, buildStatus);

      const state: ProjectState = {
        currentTask,
        project: this.getProjectInfo(),
        milestone,
        workingTree,
        nextActions: this.todo.getNextActions(),
        brain: brainData,
        build: buildStatus,
        recent: {
          commits: this.git.getRecentCommits(5),
          sessions: this.session.getRecentSessions(3),
        },
        status,
      };

      // Attach workspace index snapshot if stats available
      if (indexStats) {
        state.workspaceIndex = this.toIndexSnapshot(indexStats);
      }

      // Optionally compose DevelopmentState (M13)
      state.developmentState = this.computeDevelopmentState(
        workingTree,
        milestone,
        brainData,
      );

      // Pre-compute recommendation (M13 stabilization)
      if (state.developmentState) {
        try {
          const activity = toProjectActivity(state.developmentState);
          state.recommendation = activity.nextAction;
        } catch {
          // recommendation is optional — never block refresh
        }
      }

      if (isDevMode()) {
        // Validate the ProjectState directly
        this.runValidation(state);
      }

      return state;
    } finally {
      if (this._activity === "refreshing") {
        this.setActivity("idle");
      }
    }
  }

  // ----------------------------------------------------------
  // Legacy: getData() — returns DashboardRawData for backward
  // compatibility. Prefer getProjectState() for new code.
  // Internally delegates to getProjectState() so validation
  // runs against the full ProjectState.
  // ----------------------------------------------------------

  /**
   * @deprecated Use getProjectState() instead.
   */
  async getData(indexStats?: IndexStats | null): Promise<DashboardRawData> {
    const state = await this.getProjectState(indexStats);
    return {
      milestone: state.milestone,
      workingTree: state.workingTree,
      nextActions: state.nextActions,
      recent: state.recent,
      workspaceIndex: state.workspaceIndex,
    };
  }

  // ----------------------------------------------------------
  // Workspace index snapshot helper
  // ----------------------------------------------------------

  private toIndexSnapshot(stats: IndexStats): WorkspaceIndexSnapshot {
    return {
      totalFiles: stats.totalFiles,
      totalDirectories: stats.totalDirectories,
      lastIndexTime: Date.now(),
    };
  }

  // ----------------------------------------------------------
  // Build checks
  // ----------------------------------------------------------

  async runChecks(): Promise<BuildStatus> {
    this.setActivity("refreshing");
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
  // Current Task computation (M12.7)
  //
  // Finds the first unchecked task from the milestone and
  // pairs it with sprint/phase from brain + milestone data.
  // Widgets render, never derive.
  // ----------------------------------------------------------

  private computeCurrentTask(
    milestone: MilestoneProgress | null,
    brainData: BrainData,
  ): CurrentTask | null {
    if (!milestone) return null;
    const firstUnchecked = milestone.milestoneTasks.find((t) => !t.completed);
    if (!firstUnchecked) return null;
    return {
      taskId: firstUnchecked.id,
      title: firstUnchecked.description.replace(
        /^M\d+(?:[a-z](?:\.\d+)?|\.\d+[a-z]?)?:\s*/,
        ""
      ),
      sprint: brainData.currentFocus.sprint,
      phase: milestone.phase,
    };
  }

  // ----------------------------------------------------------
  // Status computation (M12.6.6)
  //
  // Pre-computes recommendation so widgets never derive status
  // from raw fields. Widgets only render.
  // ----------------------------------------------------------

  private computeStatus(
    workingTree: WorkingTree | null,
    milestone: MilestoneProgress | null,
    build: BuildStatus,
  ): ProjectStatus {
    let recommendationType: RecommendationType;
    let recommendationContext = "";

    if (workingTree && !workingTree.isClean) {
      recommendationType = "dirty-tree";
    } else if (milestone && milestone.milestoneTasks.some((t) => !t.completed)) {
      recommendationType = "continue-milestone";
      // M12.7: no longer restate task title — Current Task widget shows it
      recommendationContext = "";
    } else {
      recommendationType = "ready-for-next";
    }

    return {
      workingTree,
      build,
      recommendationType,
      recommendationContext,
    };
  }

  // ----------------------------------------------------------
  // Validation
  // ----------------------------------------------------------

  private runValidation(data: ProjectState): void {
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

  // ----------------------------------------------------------
  // Development Intelligence composition (M13)
  //
  // Optionally composes DevelopmentState from existing provider
  // outputs. If any required provider is unavailable, returns
  // undefined — callers treat DevelopmentState as optional.
  // ----------------------------------------------------------

  private computeDevelopmentState(
    workingTree: WorkingTree | null,
    milestone: MilestoneProgress | null,
    brainData: BrainData,
  ): DevelopmentState | undefined {
    try {
      const input: ProviderData = {
        workingTree,
        milestone,
        brain: brainData,
      };
      return this.devIntel.computeState(input);
    } catch (err) {
      // DevelopmentState is optional — never block Dashboard refresh
      console.warn("[DashboardService] DevelopmentIntelligenceService failed:", err);
      return undefined;
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
