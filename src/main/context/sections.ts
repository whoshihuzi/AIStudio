// ============================================================
// Context sections — one per context source.
// Each section owns its Provider reference and format logic.
// ============================================================

import type { ContextSection } from "./types.js";
import type { BrainProject, BrainCurrentFocus, BrainArchitecture, BrainDecision } from "../dashboard/types.js";
import type { BrainProvider } from "../dashboard/BrainProvider.js";
import type { GitProvider } from "../dashboard/GitProvider.js";
import type { TodoProvider } from "../dashboard/TodoProvider.js";
import type { DesignPrinciplesProvider } from "../dashboard/DesignPrinciplesProvider.js";
import type { NextAction } from "../dashboard/types.js";

// ----------------------------------------------------------
// Helper: typed section factory
// ----------------------------------------------------------

function section<T>(def: Omit<ContextSection<T>, "collect" | "format"> & {
  collect: () => T;
  format: (data: T) => string;
}): ContextSection<T> {
  return def;
}

// ----------------------------------------------------------
// project.identity (priority 100, required)
// ----------------------------------------------------------

export function createProjectIdentitySection(brain: BrainProvider): ContextSection<BrainProject> {
  return section({
    id: "project.identity",
    priority: 100,
    estimatedTokens: 80,
    required: true,
    collect: () => brain.getBrainData().project,
    format: (p) =>
      `## Project\n**${p.name}** — ${p.description}\n${p.phase} · v${p.version}`,
  });
}

// ----------------------------------------------------------
// brain.focus (priority 95, required)
// ----------------------------------------------------------

export function createCurrentFocusSection(brain: BrainProvider): ContextSection<BrainCurrentFocus> {
  return section({
    id: "brain.focus",
    priority: 95,
    estimatedTokens: 60,
    required: true,
    collect: () => brain.getBrainData().currentFocus,
    format: (f) =>
      `## Current Focus\n**${f.milestone}**\n${f.sprint} — ${f.goal}`,
  });
}

// ----------------------------------------------------------
// git.environment (priority 90, optional)
// ----------------------------------------------------------

interface GitEnv {
  branch: string;
  head: string;
  clean: boolean;
}

export function createGitEnvironmentSection(git: GitProvider): ContextSection<GitEnv> {
  return section({
    id: "git.environment",
    priority: 90,
    estimatedTokens: 80,
    required: false,
    collect: () => ({
      branch: git.getBranch(),
      head: git.getHeadCommit(),
      clean: git.getWorkingTree().isClean,
    }),
    format: (e) =>
      `## Environment\nBranch: \`${e.branch}\`  HEAD: \`${e.head}\`  Tree: ${e.clean ? "clean" : "dirty"}`,
  });
}

// ----------------------------------------------------------
// brain.architecture (priority 80, optional)
// ----------------------------------------------------------

export function createArchitectureSection(brain: BrainProvider): ContextSection<BrainArchitecture> {
  return section({
    id: "brain.architecture",
    priority: 80,
    estimatedTokens: 150,
    required: false,
    collect: () => brain.getBrainData().architecture,
    format: (a) => {
      const layerNames = a.layers
        .filter((l) => l.status === "stable")
        .map((l) => l.name)
        .join(" → ");
      const abs = a.keyAbstractions
        .map((k) => `- **${k.name}** — ${k.description}`)
        .join("\n");
      return `## Architecture\nLayers: ${layerNames}\nKey abstractions:\n${abs}`;
    },
  });
}

// ----------------------------------------------------------
// design.principles (priority 70, optional)
// ----------------------------------------------------------

export function createDesignPrinciplesSection(
  dp: DesignPrinciplesProvider,
): ContextSection<string[]> {
  return section({
    id: "design.principles",
    priority: 70,
    estimatedTokens: 100,
    required: false,
    collect: () => dp.getAbbreviated(),
    format: (titles) =>
      `## Key Principles\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
  });
}

// ----------------------------------------------------------
// todo.next-actions (priority 50, optional)
// ----------------------------------------------------------

export function createTodoActionsSection(todo: TodoProvider): ContextSection<NextAction[]> {
  return section({
    id: "todo.next-actions",
    priority: 50,
    estimatedTokens: 60,
    required: false,
    collect: () => todo.getNextActions().slice(0, 3),
    format: (actions) => {
      if (actions.length === 0) return "";
      return `## Next Actions\n${actions.map((a) => `- ${a.description}`).join("\n")}`;
    },
  });
}

// ----------------------------------------------------------
// brain.decisions (priority 40, optional)
// ----------------------------------------------------------

export function createRecentDecisionsSection(brain: BrainProvider): ContextSection<BrainDecision[]> {
  return section({
    id: "brain.decisions",
    priority: 30,
    estimatedTokens: 80,
    required: false,
    collect: () => brain.getBrainData().decisions.decisions.slice(0, 3),
    format: (decs) => {
      if (decs.length === 0) return "";
      return `## Recent Decisions\n${decs.map((d) => `- ${d.id} ${d.title} (${d.status})`).join("\n")}`;
    },
  });
}

// ----------------------------------------------------------
// git.recent-commits (priority 30, optional)
// ----------------------------------------------------------

export function createRecentCommitsSection(
  git: GitProvider,
): ContextSection<Array<{ hash: string; subject: string }>> {
  return section({
    id: "git.recent-commits",
    priority: 25,
    estimatedTokens: 90,
    required: false,
    collect: () => git.getRecentCommits(3),
    format: (commits) =>
      `## Recent Commits\n${commits.map((c) => `- \`${c.hash}\` ${c.subject}`).join("\n")}`,
  });
}
