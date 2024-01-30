var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main.ts
var import_electron = require("electron");
var import_path = require("path");
var fs = __toESM(require("fs"));
import_electron.app.setAsDefaultProtocolClient("vanella", process.execPath, ["--open-file"]);
var main = () => {
  onReady();
  appListens();
};
var onReady = () => {
  import_electron.app.whenReady().then(() => {
    const mainWindow = createWindow();
    mainWindowListens(mainWindow);
    mainWindow.center();
  });
};
var mainWindowListens = (mainWindow) => {
  import_electron.ipcMain.on("minimize", () => mainWindow.minimize());
  import_electron.ipcMain.on("maximize", () => mainWindow.maximize());
  import_electron.ipcMain.on("unmaximize", () => mainWindow.unmaximize());
  import_electron.ipcMain.on("close", () => mainWindow.close());
  import_electron.ipcMain.on("to-close", (event) => event.reply("to-check-if-be-saved"));
  import_electron.ipcMain.on("open-file-dialog", async (event) => {
    try {
      const result = await import_electron.dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Markdown Files", extensions: ["md", "markdown"] }]
      });
      event.reply("open-file-dialog-reply", result);
    } catch (error) {
      console.error("Error opening file dialog:", error);
      event.reply("open-file-dialog-reply", { error: error.message });
    }
  });
  import_electron.ipcMain.on("open-file", async (event, filePath) => {
    try {
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      event.reply("file-content", filePath, (0, import_path.dirname)(filePath), fileContent);
    } catch (error) {
      event.reply("file-error", error.message);
    }
  });
  import_electron.ipcMain.on("save-file-dialog", async (event, contentToSave) => {
    try {
      const result = await import_electron.dialog.showSaveDialog({
        properties: ["createDirectory"],
        filters: [{ name: "Markdown Files", extensions: ["md", "markdown"] }]
      });
      if (!result.canceled) {
        await fs.promises.writeFile(result.filePath, contentToSave, "utf-8");
        event.reply("save-file-dialog-reply", { filePath: result.filePath });
      } else {
        event.reply("save-file-dialog-reply", { canceled: true });
      }
    } catch (error) {
      console.error("Error saving file:", error);
      event.reply("save-file-dialog-reply", { error: error.message });
    }
  });
  import_electron.ipcMain.on("save-file", async (event, { filePath, contentToSave }) => {
    try {
      await fs.promises.writeFile(filePath, contentToSave, "utf-8");
      event.reply("file-saved", filePath, (0, import_path.dirname)(filePath));
    } catch (error) {
      console.error("Error saving file:", error);
      event.reply("file-save-error", { error: error.message });
    }
  });
  import_electron.ipcMain.on("save-as-file-dialog", async (event, contentToSave) => {
    try {
      const result = await import_electron.dialog.showSaveDialog({
        properties: ["createDirectory"],
        filters: [{ name: "Markdown Files", extensions: ["md", "markdown"] }]
      });
      if (!result.canceled) {
        await fs.promises.writeFile(result.filePath, contentToSave, "utf-8");
        event.reply("save-as-file-dialog-reply", { filePath: result.filePath });
      } else {
        event.reply("save-as-file-dialog-reply", { canceled: true });
      }
    } catch (error) {
      console.error("Error saving file as:", error);
      event.reply("save-as-file-dialog-reply", { error: error.message });
    }
  });
};
var createWindow = () => {
  const win = new import_electron.BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    resizable: true,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      preload: (0, import_path.join)(__dirname, "preload.js")
    }
  });
  const path = (0, import_path.join)(__dirname, "app", "index.html");
  win.loadFile(path);
  return win;
};
var appListens = () => {
  import_electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
      import_electron.app.quit();
  });
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
  import_electron.app.on("web-contents-created", (e, webContents) => {
    webContents.on("will-navigate", (event, url) => {
      event.preventDefault();
      import_electron.shell.openExternal(url);
    });
  });
};
main();
//# sourceMappingURL=main.js.map
