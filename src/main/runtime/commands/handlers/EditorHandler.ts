// ============================================================
// EditorHandler — editor.open, editor.save, editor.diff,
//                   editor.apply-patch.
//
// Handles content operations: reading files from disk, saving
// edited content, and computing diffs between editor content
// and the disk version.
//
// Writes go through WorkspaceService (single write gate).
// Reads go through WorkspaceService.readFileNode.
// Diffs use the pure DiffComputer.
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";
import { workspaceService } from "../../../workspace/WorkspaceService.js";
import { computeDiff } from "../../../editor/DiffComputer.js";

export class EditorHandler implements CommandHandler {
  async execute(context: CommandContext, commandId: string): Promise<CommandResult> {
    switch (commandId) {
      case "editor.open":
        return this.open(context);
      case "editor.save":
        return this.save(context);
      case "editor.diff":
        return this.diff(context);
      case "editor.apply-patch":
        return this.applyPatchHandler(context);
      default:
        return {
          success: false,
          commandId,
          error: `EditorHandler: unknown command "${commandId}".`,
        };
    }
  }

  // ----------------------------------------------------------
  // editor.open — read file content and metadata from disk
  // ----------------------------------------------------------

  private open(context: CommandContext): CommandResult {
    const path = (context.args?.path as string) || context.selectedFile;
    if (!path) {
      return { success: false, commandId: "editor.open", error: "No file path provided." };
    }
    try {
      const { node, content } = workspaceService.readFileNode(path);
      return {
        success: true,
        commandId: "editor.open",
        payload: {
          path,
          content,
          name: node.name,
          size: node.size,
          language: node.language,
          modifiedAt: node.modifiedAt,
        },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "editor.open",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ----------------------------------------------------------
  // editor.save — write content to disk through single write gate
  // ----------------------------------------------------------

  private save(context: CommandContext): CommandResult {
    const path = (context.args?.path as string) || context.selectedFile;
    const content = context.args?.content as string;
    if (!path) {
      return { success: false, commandId: "editor.save", error: "No file path provided." };
    }
    if (content === undefined || content === null) {
      return { success: false, commandId: "editor.save", error: "No content provided." };
    }
    try {
      workspaceService.writeFile(path, content);
      return {
        success: true,
        commandId: "editor.save",
        payload: { path, size: content.length, savedAt: Date.now() },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "editor.save",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ----------------------------------------------------------
  // editor.diff — compare editor content with disk version
  // ----------------------------------------------------------

  private diff(context: CommandContext): CommandResult {
    const path = (context.args?.path as string) || context.selectedFile;
    const newContent = context.args?.content as string;
    if (!path) {
      return { success: false, commandId: "editor.diff", error: "No file path provided." };
    }
    if (newContent === undefined || newContent === null) {
      return { success: false, commandId: "editor.diff", error: "No content provided for diff." };
    }
    try {
      const diskContent = workspaceService.readFile(path).content;
      const hunks = computeDiff(diskContent, newContent);
      return {
        success: true,
        commandId: "editor.diff",
        payload: { path, hunks },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "editor.diff",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ----------------------------------------------------------
  // editor.apply-patch — parse and apply a unified diff patch
  // to the current editor content, returning new content.
  // Does NOT write to disk (caller must save separately).
  // ----------------------------------------------------------

  private applyPatchHandler(context: CommandContext): CommandResult {
    const path = (context.args?.path as string) || context.selectedFile;
    const content = context.args?.content as string;
    const patch = context.args?.patch as string;
    if (!path) {
      return { success: false, commandId: "editor.apply-patch", error: "No file path provided." };
    }
    if (content === undefined || content === null) {
      return { success: false, commandId: "editor.apply-patch", error: "No content provided." };
    }
    if (!patch || typeof patch !== "string") {
      return { success: false, commandId: "editor.apply-patch", error: "No patch string provided." };
    }
    try {
      const newContent = applyUnifiedPatch(content, patch);
      return {
        success: true,
        commandId: "editor.apply-patch",
        payload: { path, content: newContent },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "editor.apply-patch",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ============================================================
// Pure function — apply a unified diff patch to content.
// Parses @@ -l,s +l,s @@ headers and applies line changes.
// ============================================================

interface ParsedHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: Array<{ type: "context" | "add" | "remove"; content: string }>;
}

function parseUnifiedPatch(patch: string): ParsedHunk[] {
  const lines = patch.split("\n");
  const hunks: ParsedHunk[] = [];
  let currentHunk: ParsedHunk | null = null;

  const hunkHeaderRe = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)?$/;

  for (const rawLine of lines) {
    // Match hunk header
    const m = hunkHeaderRe.exec(rawLine);
    if (m) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      currentHunk = {
        oldStart: parseInt(m[1]!, 10),
        oldCount: m[2] ? parseInt(m[2], 10) : 1,
        newStart: parseInt(m[3]!, 10),
        newCount: m[4] ? parseInt(m[4], 10) : 1,
        lines: [],
      };
      continue;
    }

    if (!currentHunk) continue;

    if (rawLine.startsWith("+")) {
      currentHunk.lines.push({ type: "add", content: rawLine.slice(1) });
    } else if (rawLine.startsWith("-")) {
      currentHunk.lines.push({ type: "remove", content: rawLine.slice(1) });
    } else if (rawLine.startsWith(" ")) {
      currentHunk.lines.push({ type: "context", content: rawLine.slice(1) });
    }
    // Ignore other lines (metadata, trailing newlines, etc.)
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
}

function applyUnifiedPatch(content: string, patch: string): string {
  const hunks = parseUnifiedPatch(patch);
  if (hunks.length === 0) {
    throw new Error("No valid hunks found in patch.");
  }

  const oldLines = content.split("\n");
  const result: string[] = [];
  let oldIdx = 0; // 0-indexed position in oldLines

  for (const hunk of hunks) {
    // Copy lines from oldIdx up to hunk.oldStart - 1
    const hunkOldStart = hunk.oldStart - 1; // convert to 0-indexed
    while (oldIdx < hunkOldStart && oldIdx < oldLines.length) {
      result.push(oldLines[oldIdx]!);
      oldIdx++;
    }

    // Process hunk lines
    for (const line of hunk.lines) {
      if (line.type === "context") {
        result.push(line.content);
        oldIdx++;
      } else if (line.type === "remove") {
        // Skip this line in old content
        oldIdx++;
      } else if (line.type === "add") {
        result.push(line.content);
      }
    }
  }

  // Copy remaining lines
  while (oldIdx < oldLines.length) {
    result.push(oldLines[oldIdx]!);
    oldIdx++;
  }

  return result.join("\n");
}
