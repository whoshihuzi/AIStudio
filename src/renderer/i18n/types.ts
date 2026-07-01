// ============================================================
// i18n types — flat key union derived from the English source.
// Adding a new key here automatically requires zh-CN to match.
// ============================================================

export interface Translations {
  dashboard: {
    // Section headers (Mission Control style)
    project: string;
    workspace: string;
    health: string;
    recommendation: string;
    // Current Milestone → Milestone Progress (M12.7)
    currentTask: string;
    milestoneProgress: string;
    currentMilestone: string;
    noTodo: string;
    loading: string;
    failed: string;
    retry: string;
    phase: string;
    sprint: string;
    branch: string;
    head: string;
    lastCommit: string;
    stableBaseline: string;
    commitsSince: string;
    // Working Tree
    clean: string;
    dirty: string;
    workingTree: string;
    modified: string;
    untracked: string;
    modifiedUntracked: string;
    unknown: string;
    // Build checks
    typecheck: string;
    build: string;
    passing: string;
    failing: string;
    checksNotRun: string;
    runNow: string;
    rerunChecks: string;
    allComplete: string;
    allCompleteClean: string;
    sourceTodo: string;
    sourceGit: string;
    recentActivity: string;
    gitLabel: string;
    sessionsLabel: string;
    // Recommendations
    dirtyAction: string;
    continueMilestone: string;
    readyForNext: string;
    // Project Brain
    projectBrain: string;
    currentFocus: string;
    lastUpdated: string;
    decisionsLabel: string;
    layersLabel: string;
    // Workspace widget
    indexedFiles: string;
    indexedDirs: string;
    lastIndex: string;
    // Development Intelligence (M13)
    devHealth: string;
    devHealthNotAvailable: string;
    completion: string;
    warningsCount: string;
    commitReadiness: string;
    commitReady: string;
    commitNotReady: string;
    commitAlmostReady: string;
    risksCount: string;
    devRecommendation: string;
    devRecNotAvailable: string;
    phaseForming: string;
    phaseActive: string;
    phaseStabilizing: string;
    phaseReview: string;
    phaseReviewBlocked: string;
    devActivity: string;
    devActivityNotAvailable: string;
    changedFiles: string;
    relatedDocs: string;
    noChanges: string;
  };
  sidebar: {
    dashboard: string;
    sessions: string;
    newChat: string;
    noSessions: string;
    noSessionsHint: string;
    loading: string;
    sessionsCount: string;
    deleteTitle: string;
    workspace: string;
  };
}

export type TranslationKey = keyof Translations;
