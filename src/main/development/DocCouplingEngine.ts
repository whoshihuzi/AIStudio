// ============================================================
// DocCouplingEngine — Pure document coupling detection engine
//
// Infrastructure Layer. Zero state. Zero IO. Zero cache.
// Maps changed source file paths to related documentation paths
// using project conventions. Returns RelatedDocument[].
//
// The engine does NOT check file existence — that is the
// caller's responsibility (the service or provider layer).
// isModified is always set to false; callers update it.
// ============================================================

import type {
  DocRelationship,
  RelatedDocument,
} from "../../shared/development/types.js";

// -----------------------------------------------------------
// Internal: documentation coupling conventions
// -----------------------------------------------------------

interface DocCouplingRule {
  /** Source file path pattern (prefix match, lowercase) */
  sourcePattern: string;
  /** Documentation file path */
  docPath: string;
  /** Relationship type */
  relationship: DocRelationship;
  /** Human-readable reason for this coupling */
  reason: string;
  /** Only match if source is an architectural module (not renderer-only) */
  architecturalOnly?: boolean;
}

/**
 * Documentation coupling rules derived from project conventions.
 * Ordered by specificity — first match wins.
 *
 * M13 refinement: architecture docs are only required when
 * architectural modules changed (src/main/*, architecture/*).
 * Renderer component changes alone do NOT require architecture
 * updates — they require implementation docs or changelog.
 */
const DOC_COUPLING_RULES: DocCouplingRule[] = [
  // ── Architecture docs (only for architectural modules) ──

  // Architecture docs for dashboard module
  {
    sourcePattern: "src/main/dashboard/",
    docPath: "architecture/06_COLLABORATION.md",
    relationship: "architecture",
    reason: "Dashboard service module — architecture doc should be reviewed",
    architecturalOnly: true,
  },
  // Architecture docs for workspace module
  {
    sourcePattern: "src/main/workspace/",
    docPath: "architecture/10_WORKSPACE_PROVIDER_API.md",
    relationship: "architecture",
    reason: "Workspace infrastructure — architecture doc should be reviewed",
    architecturalOnly: true,
  },
  // Architecture docs for runtime/commands
  {
    sourcePattern: "src/main/runtime/",
    docPath: "architecture/14_COMMAND_SYSTEM.md",
    relationship: "architecture",
    reason: "Runtime/command system — architecture doc should be reviewed",
    architecturalOnly: true,
  },
  // Architecture docs for editor (shared domain model)
  {
    sourcePattern: "src/shared/editor/",
    docPath: "architecture/15_EDITOR_ARCHITECTURE.md",
    relationship: "architecture",
    reason: "Editor domain model — architecture doc should be reviewed",
    architecturalOnly: true,
  },
  // Architecture docs for development intelligence
  {
    sourcePattern: "src/main/development/",
    docPath: "architecture/16_DEVELOPMENT_INTELLIGENCE.md",
    relationship: "architecture",
    reason: "Development Intelligence engine — architecture doc should be reviewed",
    architecturalOnly: true,
  },
  {
    sourcePattern: "src/shared/development/",
    docPath: "architecture/16_DEVELOPMENT_INTELLIGENCE.md",
    relationship: "architecture",
    reason: "Development Intelligence domain — architecture doc should be reviewed",
    architecturalOnly: true,
  },
  // Context injection
  {
    sourcePattern: "src/main/context/",
    docPath: "architecture/08_CONTEXT_INJECTION.md",
    relationship: "architecture",
    reason: "Context injection pipeline — architecture doc should be reviewed",
    architecturalOnly: true,
  },

  // ── Implementation docs (renderer changes) ──

  // Editor components → editor implementation docs
  {
    sourcePattern: "src/renderer/components/editor/",
    docPath: "docs/08_UI_GUIDELINES.md",
    relationship: "implementation-docs",
    reason: "Editor UI component — UI guidelines should be reviewed",
  },
  // Workspace UX
  {
    sourcePattern: "src/renderer/components/workspace/",
    docPath: "docs/08_UI_GUIDELINES.md",
    relationship: "implementation-docs",
    reason: "Workspace UX component — UI guidelines should be reviewed",
  },
  // Design tokens / UI base components
  {
    sourcePattern: "src/renderer/components/ui/",
    docPath: "docs/08_UI_GUIDELINES.md",
    relationship: "implementation-docs",
    reason: "UI base component — design guidelines should be reviewed",
  },
  // Any renderer change → development log
  {
    sourcePattern: "src/renderer/",
    docPath: "logs/development.md",
    relationship: "logs",
    reason: "Renderer change — development log should be updated",
  },

  // ── Shared domain types → architecture (they define contracts) ──

  {
    sourcePattern: "src/shared/",
    docPath: "architecture/07_PROJECT_CONTEXT.md",
    relationship: "architecture",
    reason: "Shared domain types — project context architecture should be reviewed",
    architecturalOnly: true,
  },

  // ── Changelog (always required for source changes) ──

  {
    sourcePattern: "src/main/",
    docPath: "docs/10_CHANGELOG.md",
    relationship: "changelog",
    reason: "Main process change — should be recorded in changelog",
  },
  {
    sourcePattern: "src/renderer/",
    docPath: "docs/10_CHANGELOG.md",
    relationship: "changelog",
    reason: "Renderer change — should be recorded in changelog",
  },

  // ── Brain data ──

  {
    sourcePattern: "architecture/",
    docPath: "workspace/brain/architecture.json",
    relationship: "brain",
    reason: "Architecture documentation change — brain data should be refreshed",
  },
  {
    sourcePattern: "decisions/",
    docPath: "workspace/brain/decisions.json",
    relationship: "brain",
    reason: "Decision record — brain decisions should be updated",
  },

  // ── Cross-document coupling ──

  {
    sourcePattern: "docs/09_TODO.md",
    docPath: "docs/03_ROADMAP.md",
    relationship: "roadmap",
    reason: "TODO progress — roadmap may need adjustment",
  },
];

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

/** Normalize a path for prefix matching. */
function normalize(path: string): string {
  return path.toLowerCase().replace(/\\/g, "/");
}

/**
 * Determine if a doc path is a directory-level convention (ends in /).
 * Used to avoid duplicate directory entries.
 */
function isDirectoryRule(rule: DocCouplingRule): boolean {
  return rule.sourcePattern.endsWith("/");
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Find documentation files that should be updated alongside
 * the given set of changed source files.
 *
 * Uses project conventions to map source paths to documentation
 * paths. Returns RelatedDocument[] with isModified always false
 * (existence checking is the caller's responsibility).
 *
 * Deduplicates by (sourcePath, docPath, relationship) tuple.
 *
 * @param changedPaths  — changed file paths (relative to workspace root)
 * @param _workspaceRoot — reserved for future use (zero-IO guarantee)
 * @returns RelatedDocument[] — documentation that should change
 */
export function findRelatedDocuments(
  changedPaths: string[],
  _workspaceRoot: string,
): RelatedDocument[] {
  const seen = new Set<string>();
  const results: RelatedDocument[] = [];

  // Determine if any architectural module is changed
  const hasArchitecturalChange = changedPaths.some(
    (p) => {
      const n = normalize(p);
      return n.startsWith("src/main/") || n.startsWith("architecture/") || n.startsWith("src/shared/");
    },
  );

  for (const sourcePath of changedPaths) {
    const normalized = normalize(sourcePath);

    // Check all conventional coupling rules
    for (const rule of DOC_COUPLING_RULES) {
      const rulePattern = normalize(rule.sourcePattern);

      // Skip architectural-only rules when no architectural modules changed
      if (rule.architecturalOnly && !hasArchitecturalChange) continue;

      if (!normalized.startsWith(rulePattern)) continue;
      // For exact file matches (non-directory patterns), require exact match
      if (!isDirectoryRule(rule) && normalized !== rulePattern) continue;

      const key = `${normalized}|${rule.docPath}|${rule.relationship}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        sourcePath,
        docPath: rule.docPath,
        relationship: rule.relationship,
        isModified: false, // caller verifies existence
      });
    }

    // Always include TODO.md for source changes (task completion tracking)
    if (normalized.startsWith("src/")) {
      const todoKey = `${normalized}|docs/09_TODO.md|todo`;
      if (!seen.has(todoKey)) {
        seen.add(todoKey);
        results.push({
          sourcePath,
          docPath: "docs/09_TODO.md",
          relationship: "todo",
          isModified: false,
        });
      }
    }

    // Design principle docs only for architectural changes (src/main/ or architecture/)
    if (
      hasArchitecturalChange &&
      (normalized.startsWith("architecture/") ||
      normalized.startsWith("src/main/"))
    ) {
      const principleKey = `${normalized}|docs/06_PRINCIPLES.md|principle`;
      if (!seen.has(principleKey)) {
        seen.add(principleKey);
        results.push({
          sourcePath,
          docPath: "docs/06_PRINCIPLES.md",
          relationship: "principle",
          isModified: false,
        });
      }
    }
  }

  return results;
}
