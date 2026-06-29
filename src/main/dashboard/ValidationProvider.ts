// ============================================================
// ValidationProvider — independently verifies every piece of
// Dashboard data by running its own checks against the same
// sources (Git, TODO.md, etc.).
//
// Never uses GitProvider or TodoProvider internally — this is
// an EXTERNAL validator that confirms the Providers are correct.
// ============================================================

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { DashboardRawData, ValidationReport, ValidationEntry, ValidationStatus } from "./types.js";

export class ValidationProvider {
  // ----------------------------------------------------------
  // Validate entire DashboardRawData
  // ----------------------------------------------------------

  validate(data: DashboardRawData): ValidationReport {
    const entries: ValidationEntry[] = [];

    // --- Working Tree ---
    entries.push(...this.validateWorkingTree(data));

    // --- Git identity ---
    entries.push(...this.validateGitIdentity(data));

    // --- Baseline ---
    entries.push(...this.validateBaseline(data));

    // --- Recent commits ---
    entries.push(...this.validateRecentCommits(data));

    // --- Milestone / TODO ---
    entries.push(...this.validateMilestone(data));

    // --- Next Actions ---
    entries.push(...this.validateNextActions(data));

    const passed = entries.filter((e) => e.status === "pass").length;
    const failed = entries.filter((e) => e.status === "fail").length;
    const warnings = entries.filter((e) => e.status === "warn").length;

    return {
      timestamp: Date.now(),
      total: entries.length,
      passed,
      failed,
      warnings,
      entries,
    };
  }

  // ----------------------------------------------------------
  // Working Tree
  // ----------------------------------------------------------

  private validateWorkingTree(data: DashboardRawData): ValidationEntry[] {
    const entries: ValidationEntry[] = [];
    const wt = data.workingTree;

    try {
      const raw = execSync("git status --short", {
        encoding: "utf-8",
        cwd: process.cwd(),
      });
      const lines = raw.trim().split("\n").filter(Boolean);
      const realModified = lines.filter((l) => l.match(/^\s*M/)).length;
      const realUntracked = lines.filter((l) => l.startsWith("??")).length;
      const realIsClean = lines.length === 0;

      if (wt) {
        entries.push(this.check(
          "workingTree.isClean", wt.isClean === realIsClean,
          String(realIsClean), String(wt.isClean),
        ));
        entries.push(this.check(
          "workingTree.modified", wt.modified === realModified,
          String(realModified), String(wt.modified),
        ));
        entries.push(this.check(
          "workingTree.untracked", wt.untracked === realUntracked,
          String(realUntracked), String(wt.untracked),
        ));
      } else {
        entries.push(this.failEntry("workingTree", "null", "expected object"));
      }
    } catch (err) {
      entries.push(this.warnEntry("workingTree", "git status failed", String(err)));
    }

    return entries;
  }

  // ----------------------------------------------------------
  // Git identity: branch + HEAD
  // ----------------------------------------------------------

  private validateGitIdentity(data: DashboardRawData): ValidationEntry[] {
    const entries: ValidationEntry[] = [];
    const m = data.milestone;
    if (!m) return [this.warnEntry("milestone", "null", "no git identity to check")];

    try {
      const realBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf-8", cwd: process.cwd(),
      }).trim();
      const realHead = execSync("git rev-parse --short HEAD", {
        encoding: "utf-8", cwd: process.cwd(),
      }).trim();

      entries.push(this.check(
        "milestone.branch", m.branch === realBranch,
        realBranch, m.branch,
      ));
      entries.push(this.check(
        "milestone.headCommit", m.headCommit === realHead,
        realHead, m.headCommit,
      ));
    } catch (err) {
      entries.push(this.warnEntry("git-identity", "git rev-parse failed", String(err)));
    }

    return entries;
  }

  // ----------------------------------------------------------
  // Baseline: tag + commits since
  // ----------------------------------------------------------

  private validateBaseline(data: DashboardRawData): ValidationEntry[] {
    const entries: ValidationEntry[] = [];
    const m = data.milestone;
    if (!m) return [];

    try {
      const realTag = execSync("git describe --tags --abbrev=0", {
        encoding: "utf-8", cwd: process.cwd(),
      }).trim();
      const realCountRaw = execSync(`git rev-list --count ${realTag}..HEAD`, {
        encoding: "utf-8", cwd: process.cwd(),
      }).trim();
      const realCount = parseInt(realCountRaw, 10) || 0;

      entries.push(this.check(
        "milestone.baseline.tag", m.baseline.tag === realTag,
        realTag, m.baseline.tag,
      ));
      entries.push(this.check(
        "milestone.baseline.commitsSince", m.baseline.commitsSince === realCount,
        String(realCount), String(m.baseline.commitsSince),
      ));
    } catch {
      // No tags exist — baseline should be "none"
      entries.push(this.check(
        "milestone.baseline.tag",
        m.baseline.tag === "none" || m.baseline.tag === "",
        "none or empty (no tags)", m.baseline.tag || "(empty)",
      ));
    }

    return entries;
  }

  // ----------------------------------------------------------
  // Recent commits count
  // ----------------------------------------------------------

  private validateRecentCommits(data: DashboardRawData): ValidationEntry[] {
    const entries: ValidationEntry[] = [];
    const rc = data.recent;
    if (!rc) return [this.warnEntry("recent", "null", "expected object")];

    try {
      const realLog = execSync("git log --oneline -5", {
        encoding: "utf-8", cwd: process.cwd(),
      }).trim().split("\n").filter(Boolean);

      entries.push(this.check(
        "recent.commits.length",
        rc.commits.length === realLog.length,
        String(realLog.length), String(rc.commits.length),
      ));

      // Spot-check: first commit hash
      if (rc.commits.length > 0 && realLog.length > 0) {
        const realFirst = realLog[0]!.split(" ")[0]!;
        entries.push(this.check(
          "recent.commits[0].hash",
          rc.commits[0]!.hash === realFirst,
          realFirst, rc.commits[0]!.hash,
        ));
      }
    } catch (err) {
      entries.push(this.warnEntry("recent.commits", "git log failed", String(err)));
    }

    return entries;
  }

  // ----------------------------------------------------------
  // Milestone: Sprint structure from TODO.md
  // ----------------------------------------------------------

  private validateMilestone(data: DashboardRawData): ValidationEntry[] {
    const entries: ValidationEntry[] = [];
    const m = data.milestone;
    if (!m) return [this.warnEntry("milestone", "null", "TODO.md may not exist")];

    const todoPath = join(process.cwd(), "docs", "09_TODO.md");
    if (!existsSync(todoPath)) {
      return [this.failEntry("milestone", "exists but TODO.md missing", "milestone should be null")];
    }

    try {
      const text = readFileSync(todoPath, "utf-8");
      const sprintRegex = /# Sprint (\d+)/g;
      const realSprintCount = [...text.matchAll(sprintRegex)].length;

      entries.push(this.check(
        "milestone.totalSprints", m.totalSprints === realSprintCount,
        String(realSprintCount), String(m.totalSprints),
      ));

      // Verify phase extraction
      const phaseMatch = text.match(/Phase (\d+)/);
      const realPhase = phaseMatch ? `Phase ${phaseMatch[1]}` : "";
      entries.push(this.check(
        "milestone.phase", m.phase === realPhase,
        realPhase || "not found", m.phase,
      ));

      // Verify currentSprint is within bounds
      if (m.currentSprint < 1 || m.currentSprint > m.totalSprints) {
        entries.push(this.failEntry(
          "milestone.currentSprint",
          `out of range (1-${m.totalSprints})`,
          String(m.currentSprint),
        ));
      } else {
        entries.push(this.passEntry("milestone.currentSprint", String(m.currentSprint)));
      }
    } catch (err) {
      entries.push(this.warnEntry("milestone", "TODO.md read failed", String(err)));
    }

    return entries;
  }

  // ----------------------------------------------------------
  // Next Actions: must come from TODO.md, not hardcoded
  // ----------------------------------------------------------

  private validateNextActions(data: DashboardRawData): ValidationEntry[] {
    const entries: ValidationEntry[] = [];
    const actions = data.nextActions;

    // Every action must have a valid source
    const validSources = ["TODO.md", "git", "docs"];
    let invalidSourceCount = 0;

    for (const a of actions) {
      if (!validSources.includes(a.source)) {
        invalidSourceCount++;
      }
    }

    if (invalidSourceCount > 0) {
      entries.push(this.failEntry(
        "nextActions[*].source",
        "all sources must be TODO.md, git, or docs",
        `${invalidSourceCount} invalid`,
      ));
    } else {
      entries.push(this.passEntry("nextActions[*].source", `all ${actions.length} valid`));
    }

    // Every action must have non-empty description
    const emptyDesc = actions.filter((a) => !a.description.trim()).length;
    if (emptyDesc > 0) {
      entries.push(this.failEntry(
        "nextActions[*].description", "no empty descriptions",
        `${emptyDesc} empty`,
      ));
    }

    // Verify TODO-sourced actions actually appear in TODO.md
    const todoPath = join(process.cwd(), "docs", "09_TODO.md");
    if (existsSync(todoPath)) {
      const text = readFileSync(todoPath, "utf-8");
      const todoActions = actions.filter((a) => a.source === "TODO.md");
      const mismatches: string[] = [];

      for (const a of todoActions) {
        // Extract the task name from "Sprint N: Task Name"
        const taskPart = a.description.replace(/^Sprint \d+: /, "").trim();
        if (!text.includes(taskPart)) {
          mismatches.push(taskPart.slice(0, 30));
        }
      }

      if (mismatches.length > 0) {
        entries.push(this.failEntry(
          "nextActions (TODO.md)", "actions must match TODO.md content",
          `${mismatches.length} not found: ${mismatches.slice(0, 2).join(", ")}`,
        ));
      }
    }

    return entries;
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private check(
    field: string,
    condition: boolean,
    expected: string,
    actual: string,
  ): ValidationEntry {
    if (condition) {
      return { field, status: "pass", expected, actual, message: "✓ matches" };
    }
    return {
      field,
      status: "fail",
      expected,
      actual,
      message: `✗ mismatch: expected "${expected}", got "${actual}"`,
    };
  }

  private passEntry(field: string, actual: string): ValidationEntry {
    return { field, status: "pass", expected: actual, actual, message: "✓ valid" };
  }

  private failEntry(field: string, expected: string, actual: string): ValidationEntry {
    return { field, status: "fail", expected, actual, message: `✗ ${expected}` };
  }

  private warnEntry(field: string, message: string, detail: string): ValidationEntry {
    return { field, status: "warn", expected: "—", actual: detail, message };
  }
}
