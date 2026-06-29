// ============================================================
// ConfigStore — simple JSON persistence for app settings.
// Stored at workspace/config.json.
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const CONFIG_DIR = join(process.cwd(), "workspace");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readConfig(): Record<string, unknown> {
  ensureDir();
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeConfig(data: Record<string, unknown>): void {
  ensureDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getConfig(key: string): unknown {
  const cfg = readConfig();
  return cfg[key];
}

export function setConfig(key: string, value: unknown): void {
  const cfg = readConfig();
  cfg[key] = value;
  writeConfig(cfg);
}
