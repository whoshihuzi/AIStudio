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
      sandbox: false,
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

ipcMain.on("agent:send", async (_event, prompt: string, sessionId?: string) => {
  const win = mainWindow;
  if (!win) return;

  // Load persisted runtimeState
  let runtimeState: Record<string, unknown> = {};
  if (sessionId) {
    const session = sessionStore.loadSession(sessionId);
    runtimeState = (session?.meta.runtimeState as Record<string, unknown>) ?? {};
  }

  await runtimeManager.run("hermes", prompt, runtimeState, (agentEvent: AgentEvent) => {
    win.webContents.send("agent:event", agentEvent);
  });

  // Persist updated runtimeState back to session
  if (sessionId) {
    const session = sessionStore.loadSession(sessionId);
    if (session) {
      session.meta.runtimeState = runtimeManager.getRuntimeState();
      sessionStore.saveSession(session);
    }
  }
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

let isFlushing = false;
let isQuitting = false;
const FLUSH_TIMEOUT_MS = 3000;

function performQuit(): void {
  if (mainWindow) {
    mainWindow.destroy();
    mainWindow = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  mainWindow = null;
  app.quit();
});

// ---- Window close → request flush from renderer ----
// This is the primary save-on-exit path.
app.on("browser-window-created", (_event, win) => {
  win.on("close", (e) => {
    if (isQuitting) return; // already going down
    if (!isFlushing && win.webContents && !win.webContents.isDestroyed()) {
      e.preventDefault();
      isFlushing = true;
      win.webContents.send("session:flush-request");

      // Safety: if renderer never responds, force-close after timeout
      setTimeout(() => {
        if (isFlushing) {
          isFlushing = false;
          isQuitting = true;
          performQuit();
        }
      }, FLUSH_TIMEOUT_MS);
    }
  });
});

// Renderer responds: session data is on disk. Proceed with close.
ipcMain.on("session:flush-complete", () => {
  isFlushing = false;
  isQuitting = true;
  performQuit();
});

// Belt-and-suspenders: if the app quits without going through window.close
// (e.g. Cmd+Q on macOS, task-kill), at least try one last save via IPC.
app.on("before-quit", () => {
  if (!isQuitting && mainWindow && !mainWindow.webContents.isDestroyed()) {
    // Fire-and-forget — can't block quit at this point
    mainWindow.webContents.send("session:flush-request");
  }
});
