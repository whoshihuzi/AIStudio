import { app, BrowserWindow, ipcMain, Menu } from "electron";
import { join } from "path";
import { runtimeManager } from "./runtime/runtime-manager.js";
import * as sessionStore from "./runtime/session-store.js";
import { dashboardService } from "./dashboard/DashboardService.js";
import * as configStore from "./config-store.js";
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
// Native Menu
// ============================================================

function buildMenu(): void {
  const savedLang = configStore.getConfig("language") as string | undefined;
  const currentLang = (savedLang === "zh-CN" ? "zh-CN" : "en") as "en" | "zh-CN";

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "AI Studio",
      submenu: [
        { role: "quit" as const },
      ],
    },
    {
      label: "Settings",
      submenu: [
        {
          label: "Language",
          submenu: [
            {
              label: "English",
              type: "radio",
              checked: currentLang === "en",
              click: () => setLanguage("en"),
            },
            {
              label: "简体中文",
              type: "radio",
              checked: currentLang === "zh-CN",
              click: () => setLanguage("zh-CN"),
            },
          ],
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setLanguage(locale: "en" | "zh-CN"): void {
  configStore.setConfig("language", locale);
  if (mainWindow && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send("config:language-changed", locale);
  }
  buildMenu(); // Rebuild menu to update radio state
}

// ============================================================
// IPC: Agent Runtime
// ============================================================

ipcMain.on("agent:send", async (_event, prompt: string, sessionId?: string) => {
  const win = mainWindow;
  if (!win) return;

  let runtimeState: Record<string, unknown> = {};
  if (sessionId) {
    const session = sessionStore.loadSession(sessionId);
    runtimeState = (session?.meta.runtimeState as Record<string, unknown>) ?? {};
  }

  await runtimeManager.run("hermes", prompt, runtimeState, (agentEvent: AgentEvent) => {
    win.webContents.send("agent:event", agentEvent);
  });

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
// IPC: Dashboard
// ============================================================

ipcMain.handle("dashboard:get-data", async () => {
  return dashboardService.getData();
});

ipcMain.handle("dashboard:run-checks", async () => {
  return dashboardService.runChecks();
});

// ============================================================
// IPC: Project Identity
// ============================================================

ipcMain.handle("project:get-info", () => {
  return dashboardService.getProjectInfo();
});

// ============================================================
// IPC: Config
// ============================================================

ipcMain.handle("config:get", (_event, key: string) => {
  return configStore.getConfig(key);
});

ipcMain.handle("config:set", (_event, key: string, value: unknown) => {
  configStore.setConfig(key, value);
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

app.whenReady().then(() => {
  createWindow();
  buildMenu();
});

app.on("window-all-closed", () => {
  mainWindow = null;
  app.quit();
});

app.on("browser-window-created", (_event, win) => {
  win.on("close", (e) => {
    if (isQuitting) return;
    if (!isFlushing && win.webContents && !win.webContents.isDestroyed()) {
      e.preventDefault();
      isFlushing = true;
      win.webContents.send("session:flush-request");

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

ipcMain.on("session:flush-complete", () => {
  isFlushing = false;
  isQuitting = true;
  performQuit();
});

app.on("before-quit", () => {
  if (!isQuitting && mainWindow && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send("session:flush-request");
  }
});
