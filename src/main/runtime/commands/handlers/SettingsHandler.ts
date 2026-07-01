// ============================================================
// SettingsHandler — orchestrates settings commands.
//
// Handles: settings.language
// ============================================================

import type { CommandContext, CommandResult } from "../../../../shared/command/types.js";
import type { CommandHandler } from "../CommandHandler.js";
import * as configStore from "../../../config-store.js";

export class SettingsHandler implements CommandHandler {
  /**
   * @param onLanguageChanged — optional callback invoked after config
   *   is persisted, so the main process can broadcast the change via IPC.
   *   Receives the new locale string (e.g. "en" or "zh-CN").
   */
  constructor(
    private readonly onLanguageChanged?: (locale: "en" | "zh-CN") => void,
  ) {}

  async execute(context: CommandContext, commandId: string): Promise<CommandResult> {
    switch (commandId) {
      case "settings.language":
        return this.setLanguage(context);
      default:
        return { success: false, commandId, error: `SettingsHandler: unknown command "${commandId}"` };
    }
  }

  // ----------------------------------------------------------
  // settings.language — switch UI language
  // ----------------------------------------------------------

  private setLanguage(context: CommandContext): CommandResult {
    try {
      // Determine target locale: prefer context query, else toggle current
      const query = context.query?.trim().toLowerCase();
      let locale: "en" | "zh-CN";

      if (query === "en" || query === "english") {
        locale = "en";
      } else if (query === "zh-cn" || query === "chinese" || query === "中文") {
        locale = "zh-CN";
      } else {
        // Toggle: if current is zh-CN → en, otherwise zh-CN
        const current = configStore.getConfig("language");
        locale = current === "zh-CN" ? "en" : "zh-CN";
      }

      configStore.setConfig("language", locale);

      // Notify main process to broadcast IPC + rebuild menu
      this.onLanguageChanged?.(locale);

      return {
        success: true,
        commandId: "settings.language",
        payload: { language: locale },
      };
    } catch (err) {
      return {
        success: false,
        commandId: "settings.language",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
