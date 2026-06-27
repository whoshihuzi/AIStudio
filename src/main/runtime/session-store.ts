import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "fs";
import { join, dirname } from "path";
import type { SessionMeta, SessionData } from "./types.js";

const SESSIONS_DIR = join(process.cwd(), "workspace", "sessions");
const INDEX_PATH = join(SESSIONS_DIR, "index.json");

function ensureDir(): void {
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function readIndex(): SessionMeta[] {
  ensureDir();
  try {
    const raw = readFileSync(INDEX_PATH, "utf-8");
    return JSON.parse(raw) as SessionMeta[];
  } catch {
    return [];
  }
}

function writeIndex(meta: SessionMeta[]): void {
  ensureDir();
  writeFileSync(INDEX_PATH, JSON.stringify(meta, null, 2), "utf-8");
}

export function createSession(adapter: string): SessionMeta {
  const now = Date.now();
  const id = `session_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const meta: SessionMeta = {
    id,
    title: `Chat ${new Date(now).toLocaleString()}`,
    runtime: "process",
    adapter,
    createdAt: now,
    updatedAt: now,
  };

  const index = readIndex();
  index.push(meta);
  writeIndex(index);

  // Save empty session data
  const data: SessionData = { meta, messages: [] };
  writeFileSync(sessionPath(id), JSON.stringify(data, null, 2), "utf-8");

  return meta;
}

export function listSessions(): SessionMeta[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadSession(id: string): SessionData | null {
  try {
    const raw = readFileSync(sessionPath(id), "utf-8");
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function saveSession(data: SessionData): void {
  ensureDir();
  writeFileSync(sessionPath(data.meta.id), JSON.stringify(data, null, 2), "utf-8");

  // Update index
  const index = readIndex();
  const idx = index.findIndex((m) => m.id === data.meta.id);
  if (idx !== -1) {
    index[idx] = { ...data.meta, updatedAt: Date.now() };
  } else {
    index.push({ ...data.meta, updatedAt: Date.now() });
  }
  writeIndex(index);
}

export function deleteSession(id: string): void {
  // Remove from index
  const index = readIndex().filter((m) => m.id !== id);
  writeIndex(index);

  // Remove data file
  const path = sessionPath(id);
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

function sessionPath(id: string): string {
  return join(SESSIONS_DIR, `${id}.json`);
}
