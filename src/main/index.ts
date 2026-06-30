import { app, BrowserWindow, ipcMain, Menu } from "electron";
import { join } from "path";
import { runtimeManager } from "./runtime/runtime-manager.js";
import * as sessionStore from "./runtime/session-store.js";
import { dashboardService } from "./dashboard/DashboardService.js";
import { workspaceService } from "./workspace/WorkspaceService.js";
import { WorkspaceIndexStore } from "./workspace/WorkspaceIndexStore.js";
import { SearchProvider } from "./workspace/SearchProvider.js";
import * as configStore from "./config-store.js";
import type { AgentEvent } from "./runtime/types.js";

// ── Command System ──
import { CommandRegistry } from "./runtime/commands/CommandRegistry.js";
import { CommandExecutor } from "./runtime/commands/CommandExecutor.js";
import { registerDefaultCommands } from "./runtime/commands/DefaultCommandRegistry.js";
import { DashboardHandler } from "./runtime/commands/handlers/DashboardHandler.js";
import { WorkspaceHandler } from "./runtime/commands/handlers/WorkspaceHandler.js";
import { PreviewHandler } from "./runtime/commands/handlers/PreviewHandler.js";
import { RuntimeHandler } from "./runtime/commands/handlers/RuntimeHandler.js";
import type { CommandContext } from "../shared/command/types.js";

const workspaceIndexStore = new WorkspaceIndexStore(workspaceService);
const searchProvider = new SearchProvider(workspaceIndexStore);

// ── Command System bootstrap ──
const commandRegistry = new CommandRegistry();
registerDefaultCommands(commandRegistry);

const commandExecutor = new CommandExecutor(commandRegistry);
commandExecutor.registerHandler("dashboard.refresh", new DashboardHandler());
commandExecutor.registerHandler("dashboard.open", new DashboardHandler());
commandExecutor.registerHandler("workspace.refreshIndex", new WorkspaceHandler(workspaceIndexStore));
commandExecutor.registerHandler("preview.close", new PreviewHandler());
commandExecutor.registerHandler("runtime.runChecks", new RuntimeHandler());

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
// IPC: Project Brain
// ============================================================

ipcMain.handle("brain:get-data", () => {
  return dashboardService.getBrainData();
});

// ============================================================
// IPC: Workspace
// ============================================================

ipcMain.handle("workspace:list", (_event, path: string) => {
  return workspaceService.listNodes(path);
});

ipcMain.handle("workspace:stat", (_event, path: string) => {
  return workspaceService.statNode(path);
});

ipcMain.handle("workspace:read", (_event, path: string) => {
  return workspaceService.readFileNode(path);
});

ipcMain.handle("workspace:exists", (_event, path: string) => {
  return workspaceService.exists(path);
});

ipcMain.handle("workspace:write", (_event, path: string, content: string) => {
  workspaceService.writeFile(path, content);
});

ipcMain.handle("workspace:rename", (_event, from: string, to: string) => {
  workspaceService.rename(from, to);
});

ipcMain.handle("workspace:mkdir", (_event, path: string) => {
  workspaceService.mkdir(path);
});

ipcMain.handle("workspace:delete", (_event, path: string) => {
  workspaceService.delete(path);
});

ipcMain.handle("workspace:copy", (_event, from: string, to: string) => {
  workspaceService.copy(from, to);
});

ipcMain.handle("workspace:move", (_event, from: string, to: string) => {
  workspaceService.move(from, to);
});

// ============================================================
// IPC: Workspace Index
// ============================================================

ipcMain.handle("workspace:index:rebuild", () => {
  return workspaceIndexStore.rebuild();
});

ipcMain.handle("workspace:index:stats", () => {
  return workspaceIndexStore.getStats();
});

// ============================================================
// IPC: Search
// ============================================================

ipcMain.handle("workspace:search:name", (_event, query: string, limit?: number) => {
  return searchProvider.findBySubstring(query, limit ?? 100);
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
// IPC: Command System
// ============================================================

ipcMain.handle("command:execute", async (_event, commandId: string, args?: Record<string, unknown>) => {
  const context: CommandContext = {
    currentView: "dashboard", // default; may be overridden by UI in future
  };
  if (args?.selectedFile && typeof args.selectedFile === "string") {
    context.selectedFile = args.selectedFile;
  }
  if (args?.activeSessionId && typeof args.activeSessionId === "string") {
    context.activeSessionId = args.activeSessionId;
  }
  return commandExecutor.execute(commandId, context);
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
