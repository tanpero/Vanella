import electron from "electron";
const { app, BrowserWindow, ipcMain } = electron;
import path from "node:path";
import { createHash } from "node:crypto";

type NativeModule = {
  hashSha256: (input: string) => string;
  dbInit: (dbPath: string) => boolean;
  dbExecute: (dbPath: string, sql: string, paramsJson?: string) => number;
  dbQuery: (dbPath: string, sql: string, paramsJson?: string) => string;
  dbMigrate: (dbPath: string, migrations: string[]) => boolean;
  dbVacuum: (dbPath: string) => boolean;
  dbBackup: (dbPath: string, backupPath: string) => boolean;
};

let native: NativeModule | null = null;
async function loadNative(): Promise<void> {
  try {
    const modPath = path.join(
      __dirname,
      "..",
      "native",
      "rust-addon",
      "index.node",
    );
    const mod = await import(modPath);
    native = mod as unknown as NativeModule;
  } catch {
    native = null;
  }
}

function hashSha256(input: string): string {
  if (native) return native.hashSha256(input);
  const h = createHash("sha256");
  h.update(input);
  return h.digest("hex");
}

function resolveDbPath(): string {
  const base = app.getPath("userData");
  return path.join(base, "vanella.sqlite3");
}

function dbExecute(sql: string, params?: unknown[]): number {
  if (!native) throw new Error("native addon not loaded");
  const dbPath = resolveDbPath();
  const paramsJson = JSON.stringify(params ?? []);
  return native.dbExecute(dbPath, sql, paramsJson);
}

function dbQuery<T = unknown>(sql: string, params?: unknown[]): T[] {
  if (!native) throw new Error("native addon not loaded");
  const dbPath = resolveDbPath();
  const paramsJson = JSON.stringify(params ?? []);
  const json = native.dbQuery(dbPath, sql, paramsJson);
  return JSON.parse(json) as T[];
}

function resolveIcon(): string {
  const isDev =
    process.env.ELECTRON_DEV === "true" ||
    Boolean(process.env.VITE_DEV_SERVER_URL);
  if (isDev) return path.join(process.cwd(), "public", "favicon.ico");
  return path.join(process.resourcesPath, "public", "favicon.ico");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: resolveIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  const devUrl = "http://localhost:5173";
  if (process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_DEV === "true") {
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  void loadNative();
  ipcMain.handle("db:init", async () => {
    if (!native) return false;
    const ok = native.dbInit(resolveDbPath());
    return ok;
  });
  ipcMain.handle(
    "db:execute",
    async (_evt, payload: { sql: string; params?: unknown[] }) => {
      const { sql, params } = payload ?? { sql: "" };
      return dbExecute(sql, params);
    },
  );
  ipcMain.handle(
    "db:query",
    async (_evt, payload: { sql: string; params?: unknown[] }) => {
      const { sql, params } = payload ?? { sql: "" };
      return dbQuery(sql, params);
    },
  );
  ipcMain.handle("db:migrate", async (_evt, migrations: string[]) => {
    if (!native) return false;
    const ok = native.dbMigrate(
      resolveDbPath(),
      Array.isArray(migrations) ? migrations : [],
    );
    return ok;
  });
  ipcMain.handle("db:backup", async (_evt, backupPath: string) => {
    if (!native || !backupPath) return false;
    return native.dbBackup(resolveDbPath(), backupPath);
  });
  ipcMain.handle("db:vacuum", async () => {
    if (!native) return false;
    return native.dbVacuum(resolveDbPath());
  });
  ipcMain.handle("hash-sha256", async (_evt, text: string) => hashSha256(text));
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
