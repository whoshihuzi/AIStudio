// ============================================================
// English translations — the canonical source for key structure.
// Every TranslationKey defined here must have a zh-CN counterpart.
// ============================================================

import type { Translations } from "./types";

const en: Translations = {
  dashboard: {
    whereAmI: "Where am I?",
    isHealthy: "Is the project healthy?",
    whatNext: "What should I do next?",
    noTodo: "No TODO.md found. Create one to track progress.",
    loading: "Loading project status...",
    failed: "Failed to load project data",
    retry: "Retry",
    phase: "Phase",
    sprint: "Sprint",
    sprintsComplete: "of {total} Sprints complete",
    branch: "Branch",
    head: "HEAD",
    stableBaseline: "Stable Baseline",
    commitsSince: "{count} commits since",
    clean: "Clean",
    modifiedUntracked: "{modified} modified, {untracked} untracked",
    unknown: "Unknown",
    typecheck: "Typecheck",
    build: "Build",
    passing: "Passing",
    failing: "Failing",
    checksNotRun: "Checks not yet run.",
    runNow: "Run now",
    rerunChecks: "Rerun checks",
    workingTree: "Working tree",
    allComplete: "All Sprint tasks complete.",
    allCompleteClean: "All Sprint tasks complete. Working tree clean.",
    sourceTodo: "TODO.md",
    sourceGit: "git",
    recentActivity: "Recent activity ({commits} commits, {sessions} sessions)",
    gitLabel: "Git",
    sessionsLabel: "Sessions",
    dirtyAction: "Commit or stash {count} uncommitted changes before starting new work",
  },
  sidebar: {
    dashboard: "Dashboard",
    sessions: "Sessions",
    newChat: "+",
    noSessions: "No sessions yet.",
    noSessionsHint: "Click + to create one.",
    loading: "Loading...",
    sessionsCount: "{count} session{plural}",
    deleteTitle: "Delete",
  },
};

export default en;
