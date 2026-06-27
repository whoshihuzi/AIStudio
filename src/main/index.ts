import { app, BrowserWindow } from "electron";
import { join } from "path";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#1e1e1e",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, "../preload/index.js"),
    },
  });

  win.loadFile(join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});
