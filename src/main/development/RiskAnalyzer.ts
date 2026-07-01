// ============================================================
// RiskAnalyzer — Pure risk identification engine
//
// Infrastructure Layer. Zero state. Zero IO. Zero cache.
// Maps DevelopmentWarning[] to UncommittedRisk[].
//
// Each warning category maps to risk severity and mitigation
// recommendations. The engine produces actionable risk items
// that the Dashboard can surface.
// ============================================================

import type {
  DevelopmentWarning,
  RiskLevel,
  UncommittedRisk,
  WorkingSet,
  WorkingSetMember,
} from "../../shared/development/types.js";

// -----------------------------------------------------------
// Internal: risk templates by warning category
// -----------------------------------------------------------

interface RiskTemplate {
  description: string;
  defaultSeverity: RiskLevel;
  mitigation: string;
}

/**
 * Risk templates for each warning category.
 * These are conventions — evolved per architecture Section 8.
 */
const RISK_TEMPLATES: Record<string, RiskTemplate> = {
  contamination: {
    description: "Changed files span multiple milestones",
    defaultSeverity: "high",
    mitigation:
      "Split the commit into milestone-specific groups. " +
      "Commit each milestone's changes separately to maintain clean Git history.",
  },
  "forgotten-files": {
    description: "Expected paired files are missing from the working set",
    defaultSeverity: "medium",
    mitigation:
      "Review the listed files and add them to the working set if needed. " +
      "Test files and documentation should change alongside source code.",
  },
  "missing-docs": {
    description: "Documentation has not been updated alongside code changes",
    defaultSeverity: "medium",
    mitigation:
      "Update CHANGELOG.md, architecture docs, TODO.md, and brain data " +
      "to reflect the changes before committing.",
  },
  "missing-tests": {
    description: "Test coverage is incomplete for changed source files",
    defaultSeverity: "medium",
    mitigation:
      "Add or update tests for the changed source files. " +
      "Untested changes increase regression risk.",
  },
  "orphan-changes": {
    description: "Changed files have no clear development objective",
    defaultSeverity: "low",
    mitigation:
      "Assign these files to a milestone or working set. " +
      "Orphan changes may indicate scope creep or unplanned work.",
  },
  "large-change": {
    description: "Working set is unusually large",
    defaultSeverity: "medium",
    mitigation:
      "Consider splitting the working set into smaller, focused commits. " +
      "Large commits are harder to review and risk mixing unrelated changes.",
  },
  "stale-branch": {
    description: "Branch is behind or ahead of remote",
    defaultSeverity: "medium",
    mitigation:
      "Synchronize with the remote branch: pull latest changes or push pending work. " +
      "Stale branches risk merge conflicts.",
  },
};

// -----------------------------------------------------------
// Internal: severity escalation
// -----------------------------------------------------------

/**
 * Escalate risk severity based on working set state.
 * Error-level warnings → high risk.
 * Large working sets with warnings → escalated risk.
 */
function escalateSeverity(
  templateSeverity: RiskLevel,
  warning: DevelopmentWarning,
  workingSet: WorkingSet,
): RiskLevel {
  // Error warnings are always at least "medium"
  if (warning.severity === "error") {
    return templateSeverity === "low" ? "medium" : "high";
  }

  // Large working sets with warnings escalate
  if (
    workingSet.members.length > 10 &&
    templateSeverity === "low"
  ) {
    return "medium";
  }

  return templateSeverity;
}

// -----------------------------------------------------------
// Internal: working set health risks
// -----------------------------------------------------------

/**
 * Detect risks inherent in the working set state itself.
 */
function workingSetRisks(workingSet: WorkingSet): UncommittedRisk[] {
  const risks: UncommittedRisk[] = [];

  // Many unknown-classified files = high risk
  const unknownCount = workingSet.members.filter(
    (m: WorkingSetMember) => m.classification === "unknown",
  ).length;
  if (unknownCount > 3) {
    risks.push({
      description: `${unknownCount} files have unknown classification`,
      severity: "high",
      mitigation:
        "Review these files to determine their relationship to the current milestone. " +
        "Unknown files may indicate scope creep or misclassified changes.",
    });
  }

  // Incidental files in working set
  const incidentalCount = workingSet.members.filter(
    (m: WorkingSetMember) => m.classification === "incidental",
  ).length;
  if (incidentalCount > 5) {
    risks.push({
      description: `${incidentalCount} incidental files in working set`,
      severity: "low",
      mitigation:
        "Verify that incidental files are truly unrelated to the milestone. " +
        "Consider committing them separately if they belong to other work.",
    });
  }

  // Abandoned phase = risk
  if (workingSet.phase === "abandoned") {
    risks.push({
      description: "Working set has been abandoned",
      severity: "low",
      mitigation:
        "Clean up or remove abandoned working set files. " +
        "Abandoned work should be stashed or committed if partially complete.",
    });
  }

  return risks;
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Analyze risks present in the uncommitted working state.
 *
 * Maps each DevelopmentWarning to an UncommittedRisk with
 * severity escalation based on warning severity and working
 * set size. Also detects working-set-inherent risks.
 *
 * @param workingSet — the derived working set
 * @param warnings   — development warnings from WarningAnalyzer
 * @returns UncommittedRisk[] — actionable risk items
 */
export function analyzeRisks(
  workingSet: WorkingSet,
  warnings: DevelopmentWarning[],
): UncommittedRisk[] {
  const risks: UncommittedRisk[] = [];

  // Map each warning to a risk
  for (const warning of warnings) {
    const template = RISK_TEMPLATES[warning.category];
    if (!template) continue;

    const severity = escalateSeverity(
      template.defaultSeverity,
      warning,
      workingSet,
    );

    risks.push({
      description: template.description,
      severity,
      mitigation: template.mitigation,
    });
  }

  // Add working-set-inherent risks
  risks.push(...workingSetRisks(workingSet));

  // Deduplicate by description
  const seen = new Set<string>();
  const deduped: UncommittedRisk[] = [];
  for (const risk of risks) {
    if (!seen.has(risk.description)) {
      seen.add(risk.description);
      deduped.push(risk);
    }
  }

  return deduped;
}
