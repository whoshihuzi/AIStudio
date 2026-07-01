// ============================================================
// DiffComputer — pure function computing line-level diffs.
// No side effects. No IO. No state. Pure algorithm.
// ============================================================

import type { DiffHunk, DiffLine, DiffResult } from "../../shared/editor/diff.js";

// LCS-based edit operation
interface EditOp {
  type: "equal" | "insert" | "delete";
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
}

/**
 * Compute line-by-line diff between old and new content.
 * Returns hunks with context lines. Pure function — no IO.
 */
export function computeDiff(
  oldContent: string,
  newContent: string,
  contextLines: number = 3,
): DiffHunk[] {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const ops = diffLines(oldLines, newLines);
  return buildHunks(ops, oldLines, newLines, contextLines);
}

/**
 * Compute a DiffResult for a single file path.
 */
export function computeFileDiff(
  path: string,
  oldContent: string,
  newContent: string,
): DiffResult {
  return {
    path,
    hunks: computeDiff(oldContent, newContent),
  };
}

// ----------------------------------------------------------
// LCS-based line diff
// ----------------------------------------------------------

function diffLines(oldLines: string[], newLines: string[]): EditOp[] {
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Build LCS sequence (0-based line indices)
  const lcs: number[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      lcs.push(i - 1);
      i--;
      j--;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }

  // Convert LCS to edit operations
  const ops: EditOp[] = [];
  let oi = 0;
  let ni = 0;
  let li = lcs.length - 1;

  while (oi < m || ni < n) {
    if (li >= 0 && oi === lcs[li]) {
      // This line is equal
      ops.push({ type: "equal", oldStart: oi, oldCount: 1, newStart: ni, newCount: 1 });
      oi++;
      ni++;
      li--;
    } else {
      // Find blocks of deletes and inserts
      const delStart = oi;
      while (oi < m && (li < 0 || oi !== lcs[li])) {
        oi++;
      }
      const delCount = oi - delStart;
      if (delCount > 0) {
        ops.push({ type: "delete", oldStart: delStart, oldCount: delCount, newStart: ni, newCount: 0 });
      }

      const insStart = ni;
      while (ni < n && (li < 0 || oi >= m || lcs[li] !== oi)) {
        ni++;
      }
      const insCount = ni - insStart;
      if (insCount > 0) {
        ops.push({ type: "insert", oldStart: oi, oldCount: 0, newStart: insStart, newCount: insCount });
      }
    }
  }

  return mergeOps(ops);
}

// ----------------------------------------------------------
// Merge adjacent operations of the same type
// ----------------------------------------------------------

function mergeOps(ops: EditOp[]): EditOp[] {
  if (ops.length === 0) return ops;
  const merged: EditOp[] = [];
  let current = ops[0]!;
  for (let k = 1; k < ops.length; k++) {
    const next = ops[k]!;
    if (current.type === next.type) {
      current = {
        type: current.type,
        oldStart: Math.min(current.oldStart, next.oldStart),
        oldCount: current.oldCount + next.oldCount,
        newStart: Math.min(current.newStart, next.newStart),
        newCount: current.newCount + next.newCount,
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged;
}

// ----------------------------------------------------------
// Build hunks from edit operations with context lines
// ----------------------------------------------------------

function buildHunks(
  ops: EditOp[],
  oldLines: string[],
  newLines: string[],
  contextLines: number,
): DiffHunk[] {
  // Find change regions (consecutive inserts/deletes, skipping equals)
  const changeRegions: number[] = [];
  for (let i = 0; i < ops.length; i++) {
    if (ops[i]!.type !== "equal") {
      changeRegions.push(i);
    }
  }

  if (changeRegions.length === 0) return [];

  // Group contiguous change ops into hunks
  const hunkGroups: number[][] = [];
  let region: number[] = [changeRegions[0]!];
  for (let i = 1; i < changeRegions.length; i++) {
    if (changeRegions[i]! === changeRegions[i - 1]! + 1) {
      region.push(changeRegions[i]!);
    } else {
      hunkGroups.push(region);
      region = [changeRegions[i]!];
    }
  }
  hunkGroups.push(region);

  return hunkGroups.map((group) => buildHunk(group, ops, oldLines, newLines, contextLines));
}

function buildHunk(
  changeIndices: number[],
  ops: EditOp[],
  oldLines: string[],
  newLines: string[],
  contextLines: number,
): DiffHunk {
  const first = changeIndices[0]!;
  const last = changeIndices[changeIndices.length - 1]!;

  // Determine context range
  const ctxStart = Math.max(0, first - contextLines);
  const ctxEnd = Math.min(ops.length - 1, last + contextLines);

  const lines: DiffLine[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;

  // Advance to ctxStart
  for (let j = 0; j < ctxStart; j++) {
    oldLineNum += ops[j]!.oldCount;
    newLineNum += ops[j]!.newCount;
  }

  for (let i = ctxStart; i <= ctxEnd; i++) {
    const op = ops[i]!;

    if (op.type === "equal") {
      for (let k = 0; k < op.oldCount; k++) {
        lines.push({
          type: "unchanged",
          oldLineNumber: oldLineNum + k,
          newLineNumber: newLineNum + k,
          content: oldLines[op.oldStart + k]!,
        });
      }
    } else if (op.type === "delete") {
      for (let k = 0; k < op.oldCount; k++) {
        lines.push({
          type: "removed",
          oldLineNumber: oldLineNum + k,
          newLineNumber: 0,
          content: oldLines[op.oldStart + k]!,
        });
      }
    } else if (op.type === "insert") {
      for (let k = 0; k < op.newCount; k++) {
        lines.push({
          type: "added",
          oldLineNumber: 0,
          newLineNumber: newLineNum + k,
          content: newLines[op.newStart + k]!,
        });
      }
    }

    oldLineNum += op.oldCount;
    newLineNum += op.newCount;
  }

  // Compute old/new start and counts from the actual lines
  let oldStart = 0;
  let oldCount = 0;
  let newStart = 0;
  let newCount = 0;

  for (const line of lines) {
    if (line.type === "unchanged" || line.type === "removed") {
      if (oldStart === 0) oldStart = line.oldLineNumber;
      oldCount++;
    }
    if (line.type === "unchanged" || line.type === "added") {
      if (newStart === 0) newStart = line.newLineNumber;
      newCount++;
    }
  }

  return {
    oldStart: oldStart || 1,
    oldCount,
    newStart: newStart || 1,
    newCount,
    heading: "",
    lines,
  };
}
