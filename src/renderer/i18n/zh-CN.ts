// ============================================================
// 简体中文 translations — must match every key in en.ts.
// ============================================================

import type { Translations } from "./types";

const zhCN: Translations = {
  dashboard: {
    // Section headers (Mission Control style)
    project: "项目",
    workspace: "工作区",
    health: "健康",
    recommendation: "建议",
    // Current Milestone → Milestone Progress (M12.7)
    currentTask: "当前任务",
    milestoneProgress: "里程碑进度",
    currentMilestone: "下一个里程碑",
    noTodo: "未找到 TODO.md，请创建以跟踪进度。",
    loading: "正在加载项目状态...",
    failed: "无法加载项目数据",
    retry: "重试",
    phase: "阶段",
    sprint: "Sprint",
    branch: "分支",
    head: "HEAD",
    lastCommit: "最后提交",
    stableBaseline: "稳定基线",
    commitsSince: "之后 {count} 次提交",
    // Working Tree
    clean: "干净",
    dirty: "脏",
    workingTree: "工作区",
    modified: "已修改",
    untracked: "未跟踪",
    modifiedUntracked: "{modified} 个已修改, {untracked} 个未跟踪",
    unknown: "未知",
    // Build checks
    typecheck: "类型检查",
    build: "构建",
    passing: "通过",
    failing: "失败",
    checksNotRun: "尚未运行检查。",
    runNow: "立即运行",
    rerunChecks: "重新检查",
    allComplete: "所有 Sprint 任务已完成。",
    allCompleteClean: "所有任务已完成，工作区干净。",
    sourceTodo: "TODO.md",
    sourceGit: "git",
    recentActivity: "最近活动 ({commits} 次提交, {sessions} 个会话)",
    gitLabel: "Git",
    sessionsLabel: "会话",
    // Recommendations
    dirtyAction: "继续之前，请先提交或暂存当前更改。",
    continueMilestone: "继续当前工作。",
    readyForNext: "项目已准备好进入下一个里程碑。",
    // Project Brain
    projectBrain: "项目大脑",
    currentFocus: "当前焦点",
    lastUpdated: "最后更新",
    decisionsLabel: "决策",
    layersLabel: "层",
    // Workspace widget
    indexedFiles: "已索引文件",
    indexedDirs: "已索引目录",
    lastIndex: "最后索引",
    // Development Intelligence (M13)
    devHealth: "开发健康",
    devHealthNotAvailable: "开发智能尚未可用。",
    completion: "完成度",
    warningsCount: "{count} 条警告",
    commitReadiness: "提交就绪",
    commitReady: "可以提交",
    commitAlmostReady: "基本就绪 — 存在小问题",
    commitNotReady: "未就绪: {reason}",
    risksCount: "{count} 个风险",
    devRecommendation: "建议",
    devRecNotAvailable: "开发智能尚未可用。",
    phaseForming: "开始处理当前里程碑任务。",
    phaseActive: "继续当前工作 — {completion}",
    phaseStabilizing: "即将完成 — {completion}",
    phaseReview: "可以审阅。",
    phaseReviewBlocked: "审阅受阻: {reason}",
    devActivity: "开发活动",
    devActivityNotAvailable: "开发智能尚未可用。",
    changedFiles: "已更改文件",
    relatedDocs: "相关文档",
    noChanges: "工作区无更改。",
  },
  sidebar: {
    dashboard: "仪表盘",
    sessions: "会话",
    newChat: "+",
    noSessions: "暂无会话。",
    noSessionsHint: "点击 + 创建。",
    loading: "加载中...",
    sessionsCount: "{count} 个会话",
    deleteTitle: "删除",
    workspace: "工作区",
  },
};

export default zhCN;
