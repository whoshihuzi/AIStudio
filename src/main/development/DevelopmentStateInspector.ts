// ============================================================
// DevelopmentStateInspector — Development-time inspection utility
//
// Infrastructure Layer. Zero state. Zero cache.
// Accepts DevelopmentState or ProviderData and returns a
// formatted, human-readable string representation.
//
// This is NOT UI. It is a development utility for verifying
// DevelopmentState correctness in tests, debug consoles,
// and ad-hoc inspection.
//
// Usage:
//   import { inspectDevelopmentState } from "./DevelopmentStateInspector.js";
//   console.log(inspectDevelopmentState(state));
//
// ============================================================

import type {
  ChangedFile,
  CommitGroup,
  CompletionEstimate,
  DevelopmentMilestone,
  DevelopmentSprint,
  DevelopmentState,
  DevelopmentWarning,
  RelatedDocument,
  SuggestedCommitScope,
  UncommittedRisk,
  WorkingSet,
} from "../../shared/development/types.js";

import type { ProviderData } from "./types.js";
import { DevelopmentIntelligenceService } from "./DevelopmentIntelligenceService.js";

// -----------------------------------------------------------
// Severity icons for warnings
// -----------------------------------------------------------

const SEVERITY_ICON: Record<string, string> = {
  error: "🔴",
  warn: "🟡",
  info: "🔵",
};

// -----------------------------------------------------------
// Risk icons
// -----------------------------------------------------------

const RISK_ICON: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🔵",
};

// -----------------------------------------------------------
// Phase labels
// -----------------------------------------------------------

const PHASE_LABEL: Record<string, string> = {
  forming: "forming",
  active: "active",
  stabilizing: "stabilizing",
  review: "review",
  committed: "committed",
  abandoned: "abandoned",
};

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function pad(n: number, width: number = 2): string {
  return String(n).padStart(width, " ");
}

function bool(value: boolean): string {
  return value ? "YES" : "NO";
}

function ts(epoch: number): string {
  try {
    return new Date(epoch).toISOString();
  } catch {
    return String(epoch);
  }
}

function joinPaths(files: string[], max: number = 5): string {
  if (files.length === 0) return "(none)";
  const shown = files.slice(0, max);
  let out = shown.map((f) => `    ${f}`).join("\n");
  if (files.length > max) {
    out += `\n    ... and ${files.length - max} more`;
  }
  return out;
}

// -----------------------------------------------------------
// Section formatters
// -----------------------------------------------------------

function formatMilestone(m: DevelopmentMilestone): string {
  const lines = [
    "MILESTONE",
    `  ID:       ${m.id}`,
    `  Name:     ${m.name}`,
    `  Phase:    ${m.phase}`,
    `  Tasks:    ${m.taskProgress.completed}/${m.taskProgress.total} complete`,
    `  Active:   ${bool(m.isActive)}`,
  ];
  return lines.join("\n");
}

function formatSprint(s: DevelopmentSprint): string {
  const lines = [
    "SPRINT",
    `  Number:   ${s.number}`,
    `  Goal:     ${s.goal}`,
    `  Active:   ${bool(s.isActive)}`,
  ];
  return lines.join("\n");
}

function formatWorkingSet(ws: WorkingSet, index?: number): string {
  const phase = PHASE_LABEL[ws.phase] ?? ws.phase;
  const prefix = index !== undefined ? `WORKING SET ${index + 1}  ` : "WORKING SET  ";
  const lines = [
    `${prefix}${ws.id}  [${phase}]`,
    `  Milestone: ${ws.milestoneId}`,
    `  Members:  ${ws.members.length}`,
    `  Ready:    ${bool(ws.isCommitReady)}`,
  ];
  if (ws.commitBlockerReason) {
    lines.push(`  Blocker:  ${ws.commitBlockerReason}`);
  }
  lines.push(`  Created:  ${ts(ws.createdAt)}`);
  lines.push("");
  lines.push("  Classification breakdown:");

  const byClass = new Map<string, number>();
  for (const m of ws.members) {
    byClass.set(m.classification, (byClass.get(m.classification) ?? 0) + 1);
  }
  for (const [cls, count] of byClass) {
    lines.push(`    ${cls}: ${count}`);
  }

  if (ws.members.length > 0) {
    lines.push("");
    lines.push("  Files:");
    for (const m of ws.members) {
      const flags: string[] = [];
      if (m.hasTestFile) flags.push("test");
      if (m.hasDocFile) flags.push("doc");
      const flagStr = flags.length > 0 ? ` [${flags.join(",")}]` : "";
      lines.push(
        `    ${m.changeType.padEnd(10)} ${m.classification.padEnd(12)} ${m.path}${flagStr}`,
      );
    }
  }

  return lines.join("\n");
}

function formatChangedFiles(files: ChangedFile[]): string {
  if (files.length === 0) {
    return "CHANGED FILES (0)\n  (clean working tree)";
  }

  const lines = [`CHANGED FILES (${files.length})`];

  const byType = new Map<string, number>();
  for (const f of files) {
    byType.set(f.changeType, (byType.get(f.changeType) ?? 0) + 1);
  }
  const typeSummary = [...byType.entries()]
    .map(([t, c]) => `${t}: ${c}`)
    .join(", ");
  lines.push(`  By type:  ${typeSummary}`);

  for (const f of files) {
    const staged = f.staged ? " [staged]" : "";
    const milestone = f.associatedMilestone ? ` @${f.associatedMilestone}` : "";
    lines.push(`  ${f.changeType.padEnd(10)} ${f.path}${staged}${milestone}`);
  }

  return lines.join("\n");
}

function formatRelatedDocuments(docs: RelatedDocument[]): string {
  if (docs.length === 0) {
    return "RELATED DOCUMENTS (0)\n  (none)";
  }

  const lines = [`RELATED DOCUMENTS (${docs.length})`];

  for (const d of docs) {
    const mod = d.isModified ? " [modified]" : "";
    lines.push(`  ${d.sourcePath.padEnd(50)} → ${d.docPath}  [${d.relationship}]${mod}`);
  }

  return lines.join("\n");
}

function formatWarnings(warnings: DevelopmentWarning[]): string {
  if (warnings.length === 0) {
    return "WARNINGS (0)\n  (no warnings — clean)";
  }

  const lines = [`WARNINGS (${warnings.length})`];

  const sorted = [...warnings].sort((a, b) => {
    const order = { error: 0, warn: 1, info: 2 } as const;
    return (
      (order[a.severity as keyof typeof order] ?? 99) -
      (order[b.severity as keyof typeof order] ?? 99)
    );
  });

  for (const w of sorted) {
    const icon = SEVERITY_ICON[w.severity] ?? "⚪";
    lines.push(`  ${icon} ${w.message}`);
    lines.push(`       [${w.category}] — ${w.affectedFiles.length} file(s) affected`);
    if (w.affectedFiles.length > 0 && w.affectedFiles.length <= 5) {
      for (const f of w.affectedFiles) {
        lines.push(`         ${f}`);
      }
    }
  }

  return lines.join("\n");
}

function formatCompletionEstimate(ce: CompletionEstimate): string {
  const bar = renderProgressBar(ce.percentage);

  const lines = [
    "COMPLETION",
    `  ${ce.label}`,
    `  ${bar}`,
    `  Tasks:   ${pad(ce.tasks.completed)} complete / ${pad(ce.tasks.total)} total`,
    `  Files:   ${pad(ce.files.changed)} changed / ${pad(ce.files.estimated)} estimated`,
  ];

  return lines.join("\n");
}

function renderProgressBar(percentage: number, width: number = 30): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percentage}%`;
}

function formatCommitScope(scope: SuggestedCommitScope): string {
  const lines = ["COMMIT SCOPE"];

  if (scope.groups.length === 0) {
    lines.push("  (no commit groups — nothing to commit)");
  } else {
    for (let i = 0; i < scope.groups.length; i++) {
      const g = scope.groups[i];
      if (!g) continue;
      lines.push(`  Group ${i + 1}: ${g.suggestedMessage}`);
      lines.push(`    Type:  ${g.commitType}`);
      lines.push(`    Files: ${g.files.length}`);
      const shown = g.files.slice(0, 3);
      for (const f of shown) {
        lines.push(`      ${f}`);
      }
      if (g.files.length > 3) {
        lines.push(`      ... and ${g.files.length - 3} more`);
      }
    }
  }

  lines.push(`  Orphan files:      ${scope.orphanFiles.length}`);
  if (scope.orphanFiles.length > 0) {
    for (const f of scope.orphanFiles.slice(0, 3)) {
      lines.push(`    ${f}`);
    }
  }

  lines.push(`  Likely forgotten:  ${scope.likelyForgotten.length}`);
  if (scope.likelyForgotten.length > 0) {
    for (const f of scope.likelyForgotten.slice(0, 3)) {
      lines.push(`    ${f}`);
    }
  }

  lines.push(`  Mixed milestones:  ${bool(scope.mixesMultipleMilestones)}`);

  return lines.join("\n");
}

function formatRisks(risks: UncommittedRisk[]): string {
  if (risks.length === 0) {
    return "RISKS (0)\n  (no risks — safe to commit)";
  }

  const lines = [`RISKS (${risks.length})`];

  const sorted = [...risks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return (
      (order[a.severity as keyof typeof order] ?? 99) -
      (order[b.severity as keyof typeof order] ?? 99)
    );
  });

  for (const r of sorted) {
    const icon = RISK_ICON[r.severity] ?? "⚪";
    lines.push(`  ${icon} [${r.severity}] ${r.description}`);
    lines.push(`     → ${r.mitigation}`);
  }

  return lines.join("\n");
}

// -----------------------------------------------------------
// Commit Readiness section (M13 stabilization)
// -----------------------------------------------------------

function formatCommitReadiness(state: DevelopmentState): string {
  const lines = ["COMMIT READINESS"];
  const readiness = state.commitReadiness;
  const icon =
    readiness === "ready" ? "✓"
    : readiness === "almost_ready" ? "~"
    : "✗";
  lines.push(`  Status:  ${icon} ${readiness.toUpperCase()}`);
  lines.push(`  Checklist (${state.commitChecklist.length} items):`);

  for (const item of state.commitChecklist) {
    const checkIcon = item.passed ? "✓" : "✗";
    const sevIcon =
      item.severity === "error" ? "🔴"
      : item.severity === "warn" ? "🟡"
      : "  ";
    lines.push(`    ${checkIcon} ${sevIcon} [${item.category}] ${item.label}`);
  }

  return lines.join("\n");
}

// -----------------------------------------------------------
// Cross-validation section
// -----------------------------------------------------------

function formatCrossValidation(state: DevelopmentState): string {
  const lines = ["CROSS-VALIDATION"];
  let issues = 0;

  // Check: isCommitReady with non-null blocker
  if (state.workingSet.isCommitReady && state.workingSet.commitBlockerReason) {
    lines.push("  ✗ isCommitReady=true but commitBlockerReason is set");
    issues++;
  }

  // Check: isActive with "—" id
  if (state.milestone.isActive && state.milestone.id === "—") {
    lines.push("  ✗ isActive=true but milestone.id='—'");
    issues++;
  }

  // Check: completed > total
  if (
    state.milestone.taskProgress.completed >
    state.milestone.taskProgress.total
  ) {
    lines.push("  ✗ completed > total in taskProgress");
    issues++;
  }

  // Check: percentage in range
  if (
    state.completionEstimate.percentage < 0 ||
    state.completionEstimate.percentage > 100
  ) {
    lines.push("  ✗ completion percentage out of [0, 100] range");
    issues++;
  }

  // Check: estimated files positive
  if (state.completionEstimate.files.estimated <= 0) {
    lines.push("  ✗ estimated files <= 0");
    issues++;
  }

  // Check: review phase but incomplete tasks
  if (
    state.workingSet.phase === "review" &&
    state.milestone.taskProgress.completed <
      state.milestone.taskProgress.total
  ) {
    lines.push("  ✗ phase='review' but tasks incomplete");
    issues++;
  }

  // Check: mixesMultipleMilestones vs contamination warning
  const hasContaminationWarn = state.warnings.some(
    (w) => w.category === "contamination",
  );
  if (
    state.suggestedCommitScope.mixesMultipleMilestones &&
    !hasContaminationWarn
  ) {
    lines.push("  ⚠ mixesMultipleMilestones=true but no contamination warning");
    issues++;
  }

  if (issues === 0) {
    lines.push("  ✓ All checks passed");
  }

  return lines.join("\n");
}

// -----------------------------------------------------------
// Top-level formatter
// -----------------------------------------------------------

const SEPARATOR = "─".repeat(64);

/**
 * Format a DevelopmentState into a human-readable string.
 *
 * Pure function — zero side effects. Suitable for console output,
 * test assertions, and debug inspection.
 *
 * @param state — the DevelopmentState to format
 * @returns multi-line formatted string
 */
export function formatDevelopmentState(state: DevelopmentState): string {
  const sections = [
    "DevelopmentState Inspection".padStart(41).padEnd(64),
    "",
    formatMilestone(state.milestone),
    "",
    formatSprint(state.sprint),
    "",
    // Primary working set
    formatWorkingSet(state.workingSet),
    "",
  ];

  // All working sets (including unassigned)
  if (state.workingSets.length > 1) {
    sections.push(`ALL WORKING SETS (${state.workingSets.length})`);
    sections.push("");
    for (let i = 0; i < state.workingSets.length; i++) {
      const ws = state.workingSets[i];
      if (!ws) continue;
      sections.push(formatWorkingSet(ws, i));
      sections.push("");
    }
  }

  sections.push(
    formatChangedFiles(state.changedFiles),
    "",
    formatRelatedDocuments(state.relatedDocuments),
    "",
    formatWarnings(state.warnings),
    "",
    formatCompletionEstimate(state.completionEstimate),
    "",
    formatCommitScope(state.suggestedCommitScope),
    "",
    formatRisks(state.uncommittedRisks),
    "",
    formatCommitReadiness(state),
    "",
    formatCrossValidation(state),
  );

  return [
    `╔${SEPARATOR}╗`,
    ...sections.map((s) => `║ ${s.padEnd(63)}║`),
    `╚${SEPARATOR}╝`,
  ].join("\n");
}

// -----------------------------------------------------------
// Convenience: accept ProviderData
// -----------------------------------------------------------

/**
 * Inspect development state from raw provider data.
 *
 * Creates a temporary DevelopmentIntelligenceService to compute
 * the state, then formats it. The service is discarded after use.
 *
 * This is a development utility — NOT for production code paths.
 *
 * @param input — ProviderData (workingTree, milestone, brain)
 * @returns formatted string
 */
export function inspectFromProviderData(input: ProviderData): string {
  const service = new DevelopmentIntelligenceService(process.cwd());
  const state = service.computeState(input);
  return formatDevelopmentState(state);
}

/**
 * Inspect a DevelopmentState, either from a pre-computed state object
 * or from raw ProviderData.
 *
 * @param input — DevelopmentState or ProviderData
 * @returns formatted string
 */
export function inspectDevelopmentState(
  input: DevelopmentState | ProviderData,
): string {
  if ("workingSet" in input) {
    // It's a DevelopmentState (has the workingSet field)
    return formatDevelopmentState(input);
  }
  // It's ProviderData
  return inspectFromProviderData(input);
}
