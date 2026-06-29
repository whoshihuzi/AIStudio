// ============================================================
// ContextBuilder — orchestrates context injection pipeline.
//
// Composes: BrainProvider, GitProvider, TodoProvider,
// DesignPrinciplesProvider into ContextSections, then passes
// through BudgetAllocator → MarkdownFormatter.
//
// Never contains provider knowledge, budget logic, or formatting.
// ============================================================

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { ContextSectionRegistry } from "./ContextSectionRegistry.js";
import { BudgetAllocator } from "./BudgetAllocator.js";
import { MarkdownFormatter } from "./MarkdownFormatter.js";
import { BrainProvider } from "../dashboard/BrainProvider.js";
import { GitProvider } from "../dashboard/GitProvider.js";
import { TodoProvider } from "../dashboard/TodoProvider.js";
import { DesignPrinciplesProvider } from "../dashboard/DesignPrinciplesProvider.js";
import {
  createProjectIdentitySection,
  createCurrentFocusSection,
  createGitEnvironmentSection,
  createArchitectureSection,
  createDesignPrinciplesSection,
  createTodoActionsSection,
  createRecentDecisionsSection,
  createRecentCommitsSection,
} from "./sections.js";
import type { ContextRequest, ContextBuildResult, ContextBuilder as IBuilder } from "./types.js";

export class ContextBuilder implements IBuilder {
  private readonly registry = new ContextSectionRegistry();
  private readonly budget = new BudgetAllocator();
  private readonly formatter = new MarkdownFormatter();

  constructor() {
    const brain = new BrainProvider();
    const git = new GitProvider();
    const todo = new TodoProvider();
    const dp = new DesignPrinciplesProvider();

    this.registry.register(createProjectIdentitySection(brain));
    this.registry.register(createCurrentFocusSection(brain));
    this.registry.register(createGitEnvironmentSection(git));
    this.registry.register(createArchitectureSection(brain));
    this.registry.register(createDesignPrinciplesSection(dp));
    this.registry.register(createTodoActionsSection(todo));
    this.registry.register(createRecentDecisionsSection(brain));
    this.registry.register(createRecentCommitsSection(git));
  }

  build(request: ContextRequest): ContextBuildResult {
    const allSections = this.registry.getAll();
    const allocated = this.budget.allocate(allSections, request.tokenBudget);
    const context = this.formatter.format(allocated);
    const augmentedPrompt = context + "\n\n---\n\n" + request.userPrompt;

    const result: ContextBuildResult = {
      augmentedPrompt,
      tokenEstimate: allocated.reduce((sum, s) => sum + s.estimatedTokens, 0),
      sectionCount: allocated.length,
      trimmedSections: allSections.length - allocated.length,
    };

    if (isDevMode()) {
      this.writeDebug(augmentedPrompt, result);
    }

    return result;
  }

  // ----------------------------------------------------------
  // Debug output (dev only)
  // ----------------------------------------------------------

  private writeDebug(content: string, stats: ContextBuildResult): void {
    try {
      const dir = join(process.cwd(), "workspace", "debug");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "context.md"), content, "utf-8");
      console.log(
        `[ContextBuilder] debug → workspace/debug/context.md  ` +
        `${stats.sectionCount} sections, ~${stats.tokenEstimate} tokens` +
        (stats.trimmedSections > 0 ? `, ${stats.trimmedSections} trimmed` : ""),
      );
    } catch {
      // Best-effort
    }
  }
}

// ----------------------------------------------------------
// Dev mode detection
// ----------------------------------------------------------

function isDevMode(): boolean {
  return (
    !!process.env["VITE_DEV_SERVER_URL"] ||
    process.env["NODE_ENV"] === "development"
  );
}
