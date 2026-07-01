// ============================================================
// English translations — the canonical source for key structure.
// Every TranslationKey defined here must have a zh-CN counterpart.
// ============================================================

import type { Translations } from "./types";

const en: Translations = {
  dashboard: {
    // Section headers (Mission Control style)
    project: "Project",
    workspace: "Workspace",
    health: "Health",
    recommendation: "Recommendation",
    // Current Milestone → Milestone Progress (M12.7)
    currentTask: "Current Task",
    milestoneProgress: "Milestone Progress",
    currentMilestone: "Next Planned Milestone",
    noTodo: "No TODO.md found. Create one to track progress.",
    loading: "Loading project status...",
    failed: "Failed to load project data",
    retry: "Retry",
    phase: "Phase",
    sprint: "Sprint",
    branch: "Branch",
    head: "HEAD",
    lastCommit: "Last commit",
    stableBaseline: "Stable Baseline",
    commitsSince: "{count} commits since",
    // Working Tree
    clean: "Clean",
    dirty: "Dirty",
    workingTree: "Working Tree",
    modified: "Modified",
    untracked: "Untracked",
    modifiedUntracked: "{modified} modified, {untracked} untracked",
    unknown: "Unknown",
    // Build checks
    typecheck: "Typecheck",
    build: "Build",
    passing: "Passing",
    failing: "Failing",
    checksNotRun: "Checks not yet run.",
    runNow: "Run now",
    rerunChecks: "Rerun checks",
    allComplete: "All Sprint tasks complete.",
    allCompleteClean: "All tasks complete. Working tree clean.",
    sourceTodo: "TODO.md",
    sourceGit: "git",
    recentActivity: "Recent activity ({commits} commits, {sessions} sessions)",
    gitLabel: "Git",
    sessionsLabel: "Sessions",
    // Recommendations
    dirtyAction: "Commit or stash your current work before continuing.",
    continueMilestone: "Continue current work.",
    readyForNext: "Project is ready for the next milestone.",
    // Project Brain
    projectBrain: "Project Brain",
    currentFocus: "Current Focus",
    lastUpdated: "Last updated",
    decisionsLabel: "decisions",
    layersLabel: "layers",
    // Workspace widget
    indexedFiles: "Indexed Files",
    indexedDirs: "Indexed Directories",
    lastIndex: "Last Index",
    // Development Intelligence (M13)
    devHealth: "Development Health",
    devHealthNotAvailable: "Development Intelligence not yet available.",
    completion: "Completion",
    warningsCount: "{count} warning{plural}",
    commitReadiness: "Commit Readiness",
    commitReady: "Ready to commit",
    commitAlmostReady: "Almost ready — minor issues",
    commitNotReady: "Not ready: {reason}",
    risksCount: "{count} risk{plural}",
    devRecommendation: "Recommendation",
    devRecNotAvailable: "Development Intelligence not yet available.",
    phaseForming: "Start working on the current milestone tasks.",
    phaseActive: "Continue current work — {completion}",
    phaseStabilizing: "Wrapping up — {completion}",
    phaseReview: "Ready for review.",
    phaseReviewBlocked: "Review blocked: {reason}",
    devActivity: "Development Activity",
    devActivityNotAvailable: "Development Intelligence not yet available.",
    changedFiles: "Changed Files",
    relatedDocs: "Related Documents",
    noChanges: "No changes in working tree.",
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
    workspace: "Workspace",
  },
};

export default en;
