// ============================================================
// BrainProvider — reads structured Project Brain from
// workspace/brain/*.json. Each file has a strict schema.
// Auto-syncs currentFocus from TODO.md when available.
//
// M12.6.6: BrainFocusSync now writes current-focus.json
// directly, so readCurrentFocus reads the file as the
// single source of truth (no more in-memory-only fallback).
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type {
  BrainData, BrainProject, BrainArchitecture,
  BrainDecisions, BrainCurrentFocus,
} from "./types.js";
import { parseCurrentFocusFromTodo } from "./BrainFocusSync.js";

const BRAIN_DIR = join(process.cwd(), "workspace", "brain");
const FOCUS_FILE = join(BRAIN_DIR, "current-focus.json");

export class BrainProvider {
  // ----------------------------------------------------------
  // Get full Brain snapshot
  // ----------------------------------------------------------

  getBrainData(): BrainData {
    return {
      project: this.readJson<BrainProject>("project.json", this.defaultProject()),
      architecture: this.readJson<BrainArchitecture>("architecture.json", this.defaultArchitecture()),
      decisions: this.readJson<BrainDecisions>("decisions.json", this.defaultDecisions()),
      currentFocus: this.readCurrentFocus(),
    };
  }

  // ----------------------------------------------------------
  // Seed brain directory with defaults if empty
  // ----------------------------------------------------------

  ensureSeeded(): void {
    if (!existsSync(BRAIN_DIR)) {
      mkdirSync(BRAIN_DIR, { recursive: true });
    }
    this.seedIfMissing("project.json", this.defaultProject());
    this.seedIfMissing("architecture.json", this.defaultArchitecture());
    this.seedIfMissing("decisions.json", this.defaultDecisions());
    // current-focus.json: sync from TODO.md if missing
    if (!existsSync(FOCUS_FILE)) {
      const synced = parseCurrentFocusFromTodo() ?? {
        milestone: "—",
        sprint: "—",
        goal: "No TODO.md found.",
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };
      // parseCurrentFocusFromTodo may have already written it.
      // Write only if it still doesn't exist (race-safe double check).
      if (!existsSync(FOCUS_FILE)) {
        writeFileSync(FOCUS_FILE, JSON.stringify(synced, null, 2), "utf-8");
      }
    }
  }

  // ----------------------------------------------------------
  // Internal: read with fallback
  // ----------------------------------------------------------

  private readJson<T>(filename: string, fallback: T): T {
    try {
      const raw = readFileSync(join(BRAIN_DIR, filename), "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private seedIfMissing(filename: string, data: unknown): void {
    const path = join(BRAIN_DIR, filename);
    if (!existsSync(path)) {
      writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
    }
  }

  // ----------------------------------------------------------
  // Default values (seed data)
  // ----------------------------------------------------------

  private defaultProject(): BrainProject {
    return {
      name: "AI Studio",
      description: "AI-Native Development Environment for Human & AI Collaboration",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      phase: "Phase 3 — Workspace Intelligence",
      version: "0.2.0",
    };
  }

  private defaultArchitecture(): BrainArchitecture {
    return {
      layers: [
        { name: "Presentation", path: "src/renderer/", status: "stable" },
        { name: "Domain", path: "src/shared/", status: "stable" },
        { name: "Infrastructure", path: "src/main/", status: "stable" },
      ],
      keyAbstractions: [
        { name: "IAgentRuntime", file: "src/renderer/runtime/types.ts", description: "Agent interface boundary — Renderer never imports concrete adapters" },
        { name: "ProcessAgentRuntime", file: "src/main/runtime/process-agent-runtime.ts", description: "Abstract CLI agent: spawn, parse, abort" },
        { name: "DashboardService", file: "src/main/dashboard/DashboardService.ts", description: "Single entry point for all Dashboard data" },
        { name: "SessionPersistence", file: "src/renderer/stores/session-persistence.ts", description: "Auto-save with exit flush, no React dependency" },
      ],
      updatedAt: Date.now(),
    };
  }

  private defaultDecisions(): BrainDecisions {
    return {
      decisions: [
        { id: "001", date: "2026-06-27", title: "Electron as desktop framework", status: "accepted", summary: "Mature ecosystem, excellent Windows support, VS Code-proven viability." },
        { id: "002", date: "2026-06-27", title: "Token usage data source", status: "proposed", summary: "Recommended approach: read Hermes session DB. Deferred to later milestone." },
      ],
      updatedAt: Date.now(),
    };
  }

  // ----------------------------------------------------------
  // Current Focus — synced from TODO.md at read time
  // ----------------------------------------------------------

  /**
   * M12.6.6: parseCurrentFocusFromTodo() now writes current-focus.json
   * on every successful parse. We read from the file as the single
   * source of truth, falling back to a live parse only if the file
   * is missing. No more in-memory-only divergence.
   */
  private readCurrentFocus(): BrainCurrentFocus {
    // Always re-sync on read so the file stays fresh
    const synced = parseCurrentFocusFromTodo();
    if (synced) return synced;

    // TODO.md unavailable — read existing file or return default
    return this.readJson<BrainCurrentFocus>("current-focus.json", {
      milestone: "—",
      sprint: "—",
      goal: "No TODO.md found. Create one to track progress.",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}
