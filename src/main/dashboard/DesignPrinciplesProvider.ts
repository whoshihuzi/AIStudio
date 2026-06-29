// ============================================================
// DesignPrinciplesProvider — reads abbreviated design principles
// from architecture/03_DESIGN_PRINCIPLES.md for context injection.
// ============================================================

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export class DesignPrinciplesProvider {
  private readonly path: string;

  constructor() {
    this.path = join(process.cwd(), "architecture", "03_DESIGN_PRINCIPLES.md");
  }

  /** Return abbreviated principle titles (one line each). */
  getAbbreviated(): string[] {
    try {
      if (!existsSync(this.path)) return [];
      const text = readFileSync(this.path, "utf-8");
      const titles: string[] = [];
      const regex = /^## \d+\. (.+)$/gm;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        titles.push(match[1]!);
      }
      return titles;
    } catch {
      return [];
    }
  }
}
