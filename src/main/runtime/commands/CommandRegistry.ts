// ============================================================
// CommandRegistry — in-memory Command metadata store.
//
// Owns registration, lookup, and search.
// Never executes commands — that belongs to the Executor (M11d.2).
//
// Immutable from Renderer. Only Main Process may register.
// ============================================================

import type {
  CommandDefinition,
  CommandCategory,
} from "../../../shared/command/types.js";

// ----------------------------------------------------------
// Errors
// ----------------------------------------------------------

export class CommandRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandRegistryError";
  }
}

// ----------------------------------------------------------
// Query result from search()
// ----------------------------------------------------------

export interface CommandSearchResult {
  /** Matched definition. */
  definition: CommandDefinition;
  /** Which field(s) matched the query. */
  matchedFields: ("title" | "description" | "keywords")[];
}

// ----------------------------------------------------------
// CommandRegistry
// ----------------------------------------------------------

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();

  // -------------------------------------------------------
  // Registration
  // -------------------------------------------------------

  /**
   * Register a Command.
   *
   * @throws {CommandRegistryError} if id is empty, title is empty, or id already registered.
   */
  register(command: CommandDefinition): void {
    if (!command.id || command.id.trim().length === 0) {
      throw new CommandRegistryError("Command id must not be empty.");
    }
    if (!command.title || command.title.trim().length === 0) {
      throw new CommandRegistryError(
        `Command "${command.id}" must have a non-empty title.`,
      );
    }
    if (this.commands.has(command.id)) {
      throw new CommandRegistryError(
        `Command "${command.id}" is already registered.`,
      );
    }
    this.commands.set(command.id, command);
  }

  /**
   * Remove a command by id. No-op if not found.
   */
  unregister(id: string): void {
    this.commands.delete(id);
  }

  // -------------------------------------------------------
  // Lookup
  // -------------------------------------------------------

  /** Get a single command by exact id. Returns undefined if not found. */
  get(id: string): CommandDefinition | undefined {
    return this.commands.get(id);
  }

  /** Check whether a command id is registered. */
  has(id: string): boolean {
    return this.commands.has(id);
  }

  /** List all registered commands in insertion order. */
  list(): CommandDefinition[] {
    return [...this.commands.values()];
  }

  /** List commands filtered by category, in insertion order. */
  listByCategory(category: CommandCategory): CommandDefinition[] {
    const results: CommandDefinition[] = [];
    for (const cmd of this.commands.values()) {
      if (cmd.category === category) {
        results.push(cmd);
      }
    }
    return results;
  }

  // -------------------------------------------------------
  // Search
  // -------------------------------------------------------

  /**
   * Case-insensitive search across title, description, and keywords.
   *
   * Results are sorted by title ascending (lexicographic, case-insensitive).
   */
  search(query: string): CommandSearchResult[] {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) return [];

    const results: CommandSearchResult[] = [];

    for (const definition of this.commands.values()) {
      const matched: ("title" | "description" | "keywords")[] = [];

      if (definition.title.toLowerCase().includes(normalized)) {
        matched.push("title");
      }
      if (definition.description.toLowerCase().includes(normalized)) {
        matched.push("description");
      }
      if (
        definition.keywords.some((kw) =>
          kw.toLowerCase().includes(normalized),
        )
      ) {
        matched.push("keywords");
      }

      if (matched.length > 0) {
        results.push({ definition, matchedFields: matched });
      }
    }

    results.sort((a, b) =>
      a.definition.title
        .toLowerCase()
        .localeCompare(b.definition.title.toLowerCase()),
    );

    return results;
  }

  // -------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------

  /** Remove all registered commands. */
  clear(): void {
    this.commands.clear();
  }

  /** Number of registered commands. */
  get size(): number {
    return this.commands.size;
  }
}
