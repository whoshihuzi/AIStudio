// ============================================================
// 简体中文 translations — must match every key in en.ts.
// ============================================================

import type { Translations } from "./types";

const zhCN: Translations = {
  dashboard: {
    whereAmI: "当前进度",
    isHealthy: "项目健康状态",
    whatNext: "下一步做什么？",
    noTodo: "未找到 TODO.md，请创建以跟踪进度。",
    loading: "正在加载项目状态...",
    failed: "无法加载项目数据",
    retry: "重试",
    phase: "阶段",
    sprint: "Sprint",
    sprintsComplete: "已完成 {total} 个 Sprint",
    branch: "分支",
    head: "HEAD",
    stableBaseline: "稳定基线",
    commitsSince: "之后 {count} 次提交",
    clean: "干净",
    modifiedUntracked: "{modified} 个已修改, {untracked} 个未跟踪",
    unknown: "未知",
    typecheck: "类型检查",
    build: "构建",
    passing: "通过",
    failing: "失败",
    checksNotRun: "尚未运行检查。",
    runNow: "立即运行",
    rerunChecks: "重新检查",
    workingTree: "工作区",
    allComplete: "所有 Sprint 任务已完成。",
    allCompleteClean: "所有任务已完成，工作区干净。",
    sourceTodo: "TODO.md",
    sourceGit: "git",
    recentActivity: "最近活动 ({commits} 次提交, {sessions} 个会话)",
    gitLabel: "Git",
    sessionsLabel: "会话",
    dirtyAction: "开始新工作前，先提交或暂存 {count} 个未提交的更改",
    projectBrain: "项目大脑",
    currentFocus: "当前焦点",
    lastUpdated: "最后更新",
    decisionsLabel: "决策",
    layersLabel: "层",
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
