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
import type { ContextRequest, ContextBuilder as IBuilder } from "./types.js";

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

  build(request: ContextRequest): string {
    const sections = this.registry.getAll();
    const allocated = this.budget.allocate(sections, request.tokenBudget);
    const context = this.formatter.format(allocated);
    const full = context + "\n\n---\n\n" + request.userPrompt;

    if (isDevMode()) {
      this.writeDebug(full);
    }

    return full;
  }

  // ----------------------------------------------------------
  // Debug output (dev only)
  // ----------------------------------------------------------

  private writeDebug(content: string): void {
    try {
      const dir = join(process.cwd(), "workspace", "debug");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "context.md"), content, "utf-8");
      console.log("[ContextBuilder] debug output → workspace/debug/context.md");
    } catch {
      // Best-effort — debug output failure must not affect production
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
