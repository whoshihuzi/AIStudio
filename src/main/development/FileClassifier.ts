// ============================================================
// FileClassifier — Pure file classification engine
//
// Infrastructure Layer. Zero state. Zero IO. Zero cache.
// Accepts plain data, returns FileClassification.
//
// Classification rules (priority order):
//   1. Path convention — file path contains milestone-related dir
//   2. Brain architecture — file mapped to known module
//   3. Fallback — "unknown"
// ============================================================

import type {
  FileChangeType,
  FileClassification,
} from "../../shared/development/types.js";
import type { BrainArchitecture } from "../dashboard/types.js";

// -----------------------------------------------------------
// Internal: milestone-to-path heuristics
// -----------------------------------------------------------

/**
 * Known directory patterns mapped to milestone identifiers.
 * Derived from project conventions — not a configuration file.
 * Direction: milestone ID → array of directory prefixes that
 * indicate a file belongs to that milestone.
 */
const MILESTONE_PATH_PATTERNS: Record<string, string[]> = {
  // M5: Conversation Rendering
  M5: ["src/renderer/components/chat/", "src/renderer/runtime/"],
  // M6: Dashboard layout + i18n
  M6: [
    "src/renderer/components/Dashboard",
    "src/renderer/i18n/",
    "src/renderer/stores/dashboard",
  ],
  // M7: Project Brain v1
  M7: ["src/main/dashboard/BrainProvider", "workspace/brain/"],
  // M8: Context Injection pipeline
  M8: ["src/main/context/"],
  // M9: Workspace Provider skeleton / Root / Shared Resource
  M9: [
    "src/main/workspace/WorkspaceProvider",
    "src/main/workspace/WorkspaceRootProvider",
    "src/main/workspace/PathResolver",
    "src/shared/workspace/",
  ],
  // M10: Workspace Explorer / File Preview / Design System / Operations
  M10: [
    "src/renderer/components/workspace/",
    "src/renderer/stores/workspace",
    "src/main/workspace/WorkspaceService",
    "src/main/workspace/WorkspaceMapper",
    "src/renderer/components/ui/",
  ],
  // M11: Metadata Index / Search / Command System
  M11: [
    "src/main/workspace/WorkspaceIndexStore",
    "src/main/workspace/WorkspaceIndexer",
    "src/main/workspace/SearchProvider",
    "src/main/runtime/commands/",
    "src/shared/command/",
  ],
  // M12: Editor / Code Manipulation
  M12: [
    "src/main/runtime/commands/handlers/DocumentHandler",
    "src/renderer/stores/editor",
    "src/renderer/components/editor/",
    "src/shared/editor/",
  ],
  // M13: Development Intelligence
  M13: ["src/main/development/", "src/shared/development/"],
};

/**
 * Path conventions that indicate a supporting change
 * regardless of milestone.
 */
const SUPPORT_PATH_PATTERNS = [
  "src/main/development/",
  "src/preload/",
  "src/shared/",
  "src/main/index.",
  "package.json",
  "tsconfig",
  "eslint",
  ".gitignore",
  ".prettierrc",
  ".editorconfig",
  ".vscode/",
];

/**
 * Path conventions that indicate a documentation change.
 */
const DOC_PATH_PATTERNS = [
  "docs/",
  "architecture/",
  "workspace/brain/",
  "logs/",
  ".hermes/",
  "CHANGELOG",
  "TODO",
  "ROADMAP",
  "README",
];

// -----------------------------------------------------------
// Internal predicates
// -----------------------------------------------------------

/** Does a file path match a given prefix (case-insensitive)? */
function pathMatchesPrefix(filePath: string, prefix: string): boolean {
  return filePath.toLowerCase().startsWith(prefix.toLowerCase());
}

/** Does the file path contain a milestone number pattern (e.g. "M12")? */
function extractMilestoneFromPath(filePath: string): string | null {
  const match = filePath.match(/\b(M\d+[a-z]?(?:\.\d+)?)\b/);
  return match && match[1] ? match[1].toUpperCase() : null;
}

/** Does the brain architecture map this file path to a known module? */
function findInBrainArchitecture(
  filePath: string,
  brain: BrainArchitecture,
): boolean {
  const normalized = filePath.toLowerCase();

  // Check layers: e.g. { name: "Presentation", path: "src/renderer/" }
  for (const layer of brain.layers) {
    if (normalized.startsWith(layer.path.toLowerCase())) {
      return true;
    }
  }

  // Check key abstractions: e.g. { name: "IAgentRuntime", file: "src/main/runtime/types.ts" }
  for (const abstr of brain.keyAbstractions) {
    if (normalized === abstr.file.toLowerCase()) {
      return true;
    }
  }

  return false;
}

/** Does the milestone name or ID appear in the file path? */
function fileMatchesMilestone(
  filePath: string,
  milestoneId: string,
): boolean {
  const normalized = filePath.toLowerCase();
  const id = milestoneId.toLowerCase();

  // Direct milestone patterns for this specific milestone
  const patterns = MILESTONE_PATH_PATTERNS[id.toUpperCase()] ?? [];
  for (const pattern of patterns) {
    if (normalized.startsWith(pattern.toLowerCase())) {
      return true;
    }
  }

  // Heuristic: milestone number in path
  const fromPath = extractMilestoneFromPath(normalized);
  if (fromPath && fromPath === id.toUpperCase()) {
    return true;
  }

  return false;
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Classify a single file path relative to a development milestone.
 *
 * Classification priority:
 *   1. Path convention match → "core"
 *   2. Brain architecture match → "support" (known layer, not milestone-specific)
 *   3. Support path pattern → "support"
 *   4. Documentation path pattern → "incidental" (doc, not code)
 *   5. Fallback → "unknown"
 *
 * @param filePath    — path relative to workspace root
 * @param _changeType — change type (reserved for future enhancement)
 * @param milestoneId — active milestone identifier (e.g. "M12")
 * @param brain       — optional brain architecture data for module mapping
 * @returns FileClassification
 */
export function classifyFile(
  filePath: string,
  _changeType: FileChangeType,
  milestoneId: string,
  brain?: BrainArchitecture,
): FileClassification {
  // Rule 1: Path convention — direct milestone match
  if (fileMatchesMilestone(filePath, milestoneId)) {
    return "core";
  }

  // Rule 2: Brain architecture match — file belongs to a known layer
  // but doesn't directly match the current milestone's path patterns.
  // Classify as "support" — legitimate codebase change, not milestone-specific.
  if (brain && findInBrainArchitecture(filePath, brain)) {
    return "support";
  }

  // Rule 3: Support paths — shared types, config, build
  for (const pattern of SUPPORT_PATH_PATTERNS) {
    if (pathMatchesPrefix(filePath, pattern)) {
      return "support";
    }
  }

  // Rule 4: Documentation paths — docs, architecture, brain
  for (const pattern of DOC_PATH_PATTERNS) {
    if (pathMatchesPrefix(filePath, pattern)) {
      return "incidental";
    }
  }

  // Rule 5: Could not determine — flagged for review
  return "unknown";
}

// -----------------------------------------------------------
// Public API: Milestone detection by file path
// -----------------------------------------------------------

/**
 * Determine which milestone a file path belongs to based on
 * project path conventions. Used by WorkingSetEngine to group
 * files into independent Working Sets by milestone.
 *
 * Checks all known MILESTONE_PATH_PATTERNS and returns the
 * first matching milestone ID, or null if none match.
 *
 * @param filePath — path relative to workspace root
 * @returns milestone ID (e.g. "M12") or null
 */
export function classifyByMilestone(filePath: string): string | null {
  const normalized = filePath.toLowerCase();

  // Check all known milestone path patterns
  for (const [milestoneId, patterns] of Object.entries(
    MILESTONE_PATH_PATTERNS,
  )) {
    for (const pattern of patterns) {
      if (normalized.startsWith(pattern.toLowerCase())) {
        return milestoneId;
      }
    }
  }

  // Heuristic: milestone number in path (e.g. "architecture/16_DEVELOPMENT_INTELLIGENCE.md")
  return extractMilestoneFromPath(filePath);
}
