// ============================================================
// GitProvider — reads Git state from the working tree.
// Internal implementation detail of the Main process.
// ============================================================

import { execSync } from "child_process";
import type { WorkingTree } from "./types.js";

export class GitProvider {
  // ----------------------------------------------------------
  // Working Tree
  // ----------------------------------------------------------

  getWorkingTree(): WorkingTree {
    try {
      const raw = execSync("git status --short", {
        encoding: "utf-8",
        cwd: process.cwd(),
      });
      const lines = raw.trim().split("\n").filter(Boolean);
      const modified = lines.filter((l) => l.match(/^\s*M/)).length;
      const untracked = lines.filter((l) => l.startsWith("??")).length;
      return {
        isClean: lines.length === 0,
        modified,
        untracked,
        files: lines.map((l) => l.trim()),
      };
    } catch {
      return { isClean: true, modified: 0, untracked: 0, files: [] };
    }
  }

  // ----------------------------------------------------------
  // Recent Commits
  // ----------------------------------------------------------

  getRecentCommits(count: number): Array<{ hash: string; subject: string }> {
    try {
      const raw = execSync(`git log --oneline -${count}`, {
        encoding: "utf-8",
        cwd: process.cwd(),
      });
      return raw
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [hash, ...rest] = line.split(" ");
          return { hash: hash!, subject: rest.join(" ") };
        });
    } catch {
      return [];
    }
  }

  // ----------------------------------------------------------
  // Baseline (latest tag + commits since)
  // ----------------------------------------------------------

  getBaseline(): { tag: string; commit: string; commitsSince: number } {
    try {
      const tag = execSync("git describe --tags --abbrev=0", {
        encoding: "utf-8",
        cwd: process.cwd(),
      }).trim();
      const commit = execSync(`git rev-list -n 1 ${tag}`, {
        encoding: "utf-8",
        cwd: process.cwd(),
      }).trim().slice(0, 7);
      const countRaw = execSync(`git rev-list --count ${tag}..HEAD`, {
        encoding: "utf-8",
        cwd: process.cwd(),
      }).trim();
      return { tag, commit, commitsSince: parseInt(countRaw, 10) || 0 };
    } catch {
      return { tag: "none", commit: "0000000", commitsSince: 0 };
    }
  }

  // ----------------------------------------------------------
  // Current branch + HEAD
  // ----------------------------------------------------------

  getBranch(): string {
    try {
      return execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf-8",
        cwd: process.cwd(),
      }).trim();
    } catch {
      return "unknown";
    }
  }

  getHeadCommit(): string {
    try {
      return execSync("git rev-parse --short HEAD", {
        encoding: "utf-8",
        cwd: process.cwd(),
      }).trim();
    } catch {
      return "0000000";
    }
  }

  // ----------------------------------------------------------
  // Last commit time (relative, e.g. "3 minutes ago")
  // ----------------------------------------------------------

  getLastCommitTime(): string {
    try {
      return execSync('git log -1 --format="%ar"', {
        encoding: "utf-8",
        cwd: process.cwd(),
      }).trim();
    } catch {
      return "unknown";
    }
  }
}
