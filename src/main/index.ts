import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { runtimeManager } from "./runtime/runtime-manager.js";
import * as sessionStore from "./runtime/session-store.js";
import type { AgentEvent } from "./runtime/types.js";

const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#1e1e1e",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, "../preload/index.mjs"),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// ============================================================
// IPC: Agent Runtime
// ============================================================

ipcMain.on("agent:send", (_event, prompt: string) => {
  const win = mainWindow;
  if (!win) return;

  runtimeManager.run("hermes", prompt, (agentEvent: AgentEvent) => {
    win.webContents.send("agent:event", agentEvent);
  });
});

ipcMain.on("agent:abort", () => {
  runtimeManager.abort();
});

// ============================================================
// IPC: Session Management
// ============================================================

ipcMain.handle("session:create", (_event, adapter: string) => {
  return sessionStore.createSession(adapter);
});

ipcMain.handle("session:list", () => {
  return sessionStore.listSessions();
});

ipcMain.handle("session:load", (_event, id: string) => {
  return sessionStore.loadSession(id);
});

ipcMain.handle("session:save", (_event, data: Parameters<typeof sessionStore.saveSession>[0]) => {
  sessionStore.saveSession(data);
});

ipcMain.handle("session:delete", (_event, id: string) => {
  sessionStore.deleteSession(id);
});

// ============================================================
// App Lifecycle
// ============================================================

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  mainWindow = null;
  app.quit();
});
