// ============================================================
// DevelopmentIntelligenceService — Pure composition hub
//
// Infrastructure Layer. Zero state. Zero IO. Zero cache.
// Zero persistence. Zero filesystem. Zero git. Zero renderer.
// Zero dashboard. Zero UI.
//
// Responsibilities (and ONLY these):
//   1. Collects provider data
//   2. Calls pure engines
//   3. Assembles DevelopmentState
//   4. Returns DevelopmentState
//
// Contains ZERO business logic. No classification. No warning
// detection. No completion estimation. No commit analysis.
// No risk analysis. Every decision is delegated to a pure engine.
//
// DashboardService is the sole integrator — only it may
// instantiate or call DevelopmentIntelligenceService.
// ============================================================

import type {
  DevelopmentState,
  DevelopmentMilestone,
  DevelopmentSprint,
  ChangedFile,
  FileChangeType,
  WorkingSet,
} from "../../shared/development/types.js";
import { createWorkingSetId } from "../../shared/development/types.js";

import type { ProviderData } from "./types.js";
import type { WorkingTree, MilestoneProgress, BrainData } from "../dashboard/types.js";

import { deriveWorkingSet, deriveWorkingSets } from "./WorkingSetEngine.js";
import { findRelatedDocuments } from "./DocCouplingEngine.js";
import { analyzeWarnings } from "./WarningAnalyzer.js";
import { estimateCompletion } from "./CompletionAnalyzer.js";
import { analyzeCommitScope, assessCommitReadiness } from "./CommitAnalyzer.js";
import { analyzeRisks } from "./RiskAnalyzer.js";

// ============================================================
// Public API
// ============================================================

export class DevelopmentIntelligenceService {
  /**
   * Absolute path to the workspace root on disk.
   * Used by DocCouplingEngine for path resolution.
   * The service never accesses the filesystem — this is a
   * configuration string, not an IO handle.
   */
  private readonly workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Pure composition: provider data → DevelopmentState.
   *
   * Zero side effects. Caller owns all provider instantiation.
   * The service receives already-collected data and composes
   * it into a single DevelopmentState snapshot.
   *
   * Handles null/missing provider data gracefully — returns
   * a valid DevelopmentState with sensible defaults even when
   * all inputs are null.
   */
  computeState(input: ProviderData): DevelopmentState {
    // --------------------------------------------------------
    // 1. Parse milestone identity
    // --------------------------------------------------------
    const milestone = this.parseMilestone(input.milestone, input.brain);
    const sprint = this.parseSprint(input.brain);

    // --------------------------------------------------------
    // 2. Parse changed files from Git working tree
    // --------------------------------------------------------
    const changedFiles = this.parseChangedFiles(
      input.workingTree,
      milestone.id,
    );

    // --------------------------------------------------------
    // 3. WorkingSetEngine: classify files → WorkingSets by milestone
    // --------------------------------------------------------
    const workingSets = deriveWorkingSets(changedFiles, input.brain?.architecture);

    // Primary working set: the active milestone's set, or the first one
    const workingSet = workingSets.length > 0
      ? (workingSets.find((ws) => ws.milestoneId === milestone.id) ?? workingSets[0]!)
      : deriveWorkingSet(changedFiles, milestone, input.brain?.architecture);

    // Ensure primary workingSet matches the active milestone's ID
    const primaryWorkingSet: WorkingSet = {
      ...workingSet,
      id: createWorkingSetId(milestone.id),
      milestoneId: milestone.id,
    };

    // --------------------------------------------------------
    // 4. DocCouplingEngine: map source paths → RelatedDocument[]
    // --------------------------------------------------------
    const changedPaths = changedFiles.map((f) => f.path);
    const relatedDocuments = findRelatedDocuments(
      changedPaths,
      this.workspaceRoot,
    );

    // --------------------------------------------------------
    // 5. WarningAnalyzer: detect warnings from state
    // --------------------------------------------------------
    const warnings = analyzeWarnings(
      primaryWorkingSet,
      changedFiles,
      relatedDocuments,
    );

    // --------------------------------------------------------
    // 6. CompletionAnalyzer: estimate completion
    // --------------------------------------------------------
    const completionEstimate = estimateCompletion(milestone, primaryWorkingSet);

    // --------------------------------------------------------
    // 7. CommitAnalyzer: analyze commit scope
    // --------------------------------------------------------
    const suggestedCommitScope = analyzeCommitScope(
      primaryWorkingSet,
      changedFiles,
      relatedDocuments,
    );

    // --------------------------------------------------------
    // 8. RiskAnalyzer: identify uncommitted risks
    // --------------------------------------------------------
    const uncommittedRisks = analyzeRisks(primaryWorkingSet, warnings);

    // --------------------------------------------------------
    // 9. Commit Readiness: tri-state + checklist
    // --------------------------------------------------------
    const { readiness, checklist } = assessCommitReadiness(
      primaryWorkingSet,
      milestone,
      warnings,
      changedFiles,
    );

    // --------------------------------------------------------
    // 10. Assemble DevelopmentState
    // --------------------------------------------------------
    return {
      milestone,
      sprint,
      workingSet: primaryWorkingSet,
      workingSets,
      changedFiles,
      relatedDocuments,
      suggestedCommitScope,
      warnings,
      completionEstimate,
      uncommittedRisks,
      commitReadiness: readiness,
      commitChecklist: checklist,
    };
  }

  // ============================================================
  // Internal: milestone identity parsing
  //
  // These are pure data transformations — extracting structured
  // fields from provider output. They are NOT business logic.
  // They do not interpret, classify, or make decisions.
  // ============================================================

  private parseMilestone(
    milestone: MilestoneProgress | null,
    brain: BrainData | null,
  ): DevelopmentMilestone {
    const id = this.extractMilestoneId(milestone, brain);
    const name = milestone?.currentMilestoneName ?? id;
    const phase = this.parsePhaseNumber(milestone?.phase);
    const completed = milestone?.milestoneTasks?.filter((t) => t.completed).length ?? 0;
    const total = milestone?.milestoneTasks?.length ?? 0;

    return {
      id,
      name,
      phase,
      taskProgress: { completed, total },
      isActive: id !== "—",
    };
  }

  private parseSprint(brain: BrainData | null): DevelopmentSprint {
    const sprintStr = brain?.currentFocus?.sprint ?? "—";
    const number = this.parseSprintNumber(sprintStr);
    const goal = brain?.currentFocus?.goal ?? "Unknown";
    const isActive = (brain?.currentFocus?.milestone ?? "—") !== "—";

    return { number, goal, isActive };
  }

  // ============================================================
  // Internal: ChangedFile[] parsing from WorkingTree
  // ============================================================

  private parseChangedFiles(
    workingTree: WorkingTree | null,
    milestoneId: string,
  ): ChangedFile[] {
    if (!workingTree || workingTree.files.length === 0) {
      return [];
    }

    return workingTree.files.map((raw) => this.parseGitLine(raw, milestoneId));
  }

  private parseGitLine(raw: string, milestoneId: string): ChangedFile {
    const trimmed = raw.trim();
    const changeType = this.classifyGitChange(trimmed);
    const path = trimmed.replace(/^.{0,3}\s+/, "");
    const staged = trimmed.startsWith("M") || trimmed.startsWith("A");

    return {
      path,
      changeType,
      associatedMilestone: milestoneId !== "—" ? milestoneId : null,
      workingSetId: null, // assigned by WorkingSetEngine
      staged,
    };
  }

  // ============================================================
  // Internal: pure data extractors
  // ============================================================

  private extractMilestoneId(
    milestone: MilestoneProgress | null,
    brain: BrainData | null,
  ): string {
    // Prefer TODO.md milestone ID (most specific)
    if (milestone?.currentMilestone?.match(/^M\d+/)) {
      return milestone.currentMilestone;
    }
    // Fall back to brain current focus
    if (brain?.currentFocus?.milestone?.match(/^M\d+/)) {
      return brain.currentFocus.milestone;
    }
    return "—";
  }

  private parsePhaseNumber(phase: string | undefined): number {
    if (!phase) return 0;
    const match = phase.match(/Phase\s+(\d+)/i);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }

  private parseSprintNumber(sprint: string): number {
    const match = sprint.match(/(\d+)/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }

  private classifyGitChange(trimmedLine: string): FileChangeType {
    if (trimmedLine.startsWith("??")) return "untracked";
    if (trimmedLine.startsWith("A")) return "added";
    if (trimmedLine.startsWith("D")) return "deleted";
    if (trimmedLine.startsWith("R")) return "renamed";
    return "modified";
  }
}
