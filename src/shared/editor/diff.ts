// ============================================================
// Diff Resource Model — shared between Main and Renderer.
// ============================================================

export type DiffLineType = "added" | "removed" | "unchanged";

export interface DiffLine {
  type: DiffLineType;
  /** Line number in the original (old) file (1-indexed, 0 if added). */
  oldLineNumber: number;
  /** Line number in the new file (1-indexed, 0 if removed). */
  newLineNumber: number;
  content: string;
}

export interface DiffHunk {
  /** Starting line in the old file (1-indexed). */
  oldStart: number;
  /** Number of lines in old file chunk. */
  oldCount: number;
  /** Starting line in the new file (1-indexed). */
  newStart: number;
  /** Number of lines in new file chunk. */
  newCount: number;
  /** Context heading (function name, etc.) — empty for now. */
  heading: string;
  lines: DiffLine[];
}

export interface DiffResult {
  /** Workspace-relative path of the file. */
  path: string;
  /** Computed diff hunks. Empty array means no changes. */
  hunks: DiffHunk[];
}
