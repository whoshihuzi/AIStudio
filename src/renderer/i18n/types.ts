// ============================================================
// i18n types — flat key union derived from the English source.
// Adding a new key here automatically requires zh-CN to match.
// ============================================================

export interface Translations {
  dashboard: {
    whereAmI: string;
    isHealthy: string;
    whatNext: string;
    noTodo: string;
    loading: string;
    failed: string;
    retry: string;
    phase: string;
    sprint: string;
    sprintsComplete: string;
    branch: string;
    head: string;
    stableBaseline: string;
    commitsSince: string;
    clean: string;
    modifiedUntracked: string;
    unknown: string;
    typecheck: string;
    build: string;
    passing: string;
    failing: string;
    checksNotRun: string;
    runNow: string;
    rerunChecks: string;
    workingTree: string;
    allComplete: string;
    allCompleteClean: string;
    sourceTodo: string;
    sourceGit: string;
    recentActivity: string;
    gitLabel: string;
    sessionsLabel: string;
    dirtyAction: string;
    projectBrain: string;
    currentFocus: string;
    lastUpdated: string;
    decisionsLabel: string;
    layersLabel: string;
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
