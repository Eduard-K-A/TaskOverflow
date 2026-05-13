import { app, ipcMain, shell, BrowserWindow, globalShortcut, Tray, screen, nativeImage, Menu } from "electron";
import { join, resolve } from "path";
import { existsSync, mkdirSync, statSync, copyFileSync } from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import Database from "better-sqlite3";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
let db;
function getDbFilePath() {
  return join(app.getPath("userData"), "taskoverflow.db");
}
function initDb() {
  const userDataPath = app.getPath("userData");
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true });
  }
  const dbPath = getDbFilePath();
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate();
}
function checkpointDbForBackup() {
  if (!db) return;
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch (e) {
    console.error("WAL checkpoint failed:", e);
  }
}
function closeDb() {
  if (!db) return;
  try {
    db.close();
  } catch (e) {
    console.error("Failed to close database:", e);
  }
  db = void 0;
}
function migrate() {
  if (!db) throw new Error("Database not initialized");
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT,
      accent TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT CHECK(status IN ('todo', 'done')) NOT NULL,
      due_date TEXT,
      position INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      is_done BOOLEAN NOT NULL CHECK (is_done IN (0, 1)),
      position INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const result = db.prepare("SELECT version FROM schema_version").get();
  if (!result) {
    db.prepare("INSERT INTO schema_version (version) VALUES (1)").run();
  }
}
const groupsRepo = {
  getAll: () => {
    if (!db) return [];
    const groups = db.prepare("SELECT * FROM groups ORDER BY position").all();
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      accent: g.accent,
      position: g.position,
      createdAt: g.created_at
    }));
  },
  create: (group) => {
    if (!db) throw new Error("Database not initialized");
    return db.prepare(`
      INSERT INTO groups (id, name, emoji, accent, position, created_at)
      VALUES (@id, @name, @emoji, @accent, @position, @createdAt)
    `).run(group);
  },
  update: (id, patch) => {
    if (!db) throw new Error("Database not initialized");
    const keys = Object.keys(patch);
    if (keys.length === 0) return;
    const setClause = keys.map((k) => {
      const dbKey = k === "createdAt" ? "created_at" : k;
      return `${dbKey} = @${k}`;
    }).join(", ");
    return db.prepare(`UPDATE groups SET ${setClause} WHERE id = @id`).run({ ...patch, id });
  },
  delete: (id) => {
    if (!db) throw new Error("Database not initialized");
    return db.prepare("DELETE FROM groups WHERE id = ?").run(id);
  },
  reorder: (orderedIds) => {
    if (!db) throw new Error("Database not initialized");
    const database = db;
    const transaction = database.transaction((ids) => {
      const stmt = database.prepare("UPDATE groups SET position = ? WHERE id = ?");
      ids.forEach((id, index) => stmt.run(index, id));
    });
    transaction(orderedIds);
  }
};
const tasksRepo = {
  getAll: () => {
    if (!db) return [];
    const database = db;
    const tasks = database.prepare("SELECT * FROM tasks ORDER BY position").all();
    return tasks.map((t) => {
      const subtasks = database.prepare("SELECT id, title, is_done as done FROM subtasks WHERE task_id = ? ORDER BY position").all(t.id).map((st) => ({
        ...st,
        done: st.done === 1
      }));
      const tags = database.prepare(`
        SELECT t.name FROM tags t
        JOIN task_tags tt ON t.id = tt.tag_id
        WHERE tt.task_id = ?
      `).all(t.id).map((row) => row.name);
      return {
        id: t.id,
        groupId: t.group_id,
        title: t.title,
        notes: t.notes ?? "",
        status: t.status,
        dueDate: t.due_date,
        position: t.position,
        createdAt: t.created_at,
        completedAt: t.completed_at,
        subtasks,
        tags
      };
    });
  },
  create: (task) => {
    if (!db) throw new Error("Database not initialized");
    return db.prepare(`
      INSERT INTO tasks (id, group_id, title, notes, status, due_date, position, created_at, completed_at)
      VALUES (@id, @groupId, @title, @notes, @status, @dueDate, @position, @createdAt, @completedAt)
    `).run(task);
  },
  update: (id, patch) => {
    if (!db) throw new Error("Database not initialized");
    const keys = Object.keys(patch).filter((k) => !["subtasks", "tags"].includes(k));
    if (keys.length > 0) {
      const setClause = keys.map((k) => {
        const dbKey = k === "groupId" ? "group_id" : k === "dueDate" ? "due_date" : k === "createdAt" ? "created_at" : k === "completedAt" ? "completed_at" : k;
        return `${dbKey} = @${k}`;
      }).join(", ");
      db.prepare(`UPDATE tasks SET ${setClause} WHERE id = @id`).run({ ...patch, id });
    }
  },
  delete: (id) => {
    if (!db) throw new Error("Database not initialized");
    return db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  },
  reorder: (groupId, orderedIds) => {
    if (!db) throw new Error("Database not initialized");
    const database = db;
    const transaction = database.transaction((ids) => {
      const stmt = database.prepare("UPDATE tasks SET position = ? WHERE id = ? AND group_id = ?");
      ids.forEach((id, index) => stmt.run(index, id, groupId));
    });
    transaction(orderedIds);
  }
};
const subtasksRepo = {
  add: (taskId, subtask) => {
    if (!db) throw new Error("Database not initialized");
    return db.prepare(`
      INSERT INTO subtasks (id, task_id, title, is_done, position)
      VALUES (@id, @taskId, @title, @isDone, @position)
    `).run({ ...subtask, taskId, isDone: subtask.done ? 1 : 0 });
  },
  update: (id, patch) => {
    if (!db) throw new Error("Database not initialized");
    if (patch.done !== void 0) patch.is_done = patch.done ? 1 : 0;
    const keys = Object.keys(patch).filter((k) => k !== "done");
    if (keys.length === 0) return;
    const setClause = keys.map((k) => `${k} = @${k}`).join(", ");
    return db.prepare(`UPDATE subtasks SET ${setClause} WHERE id = @id`).run({ ...patch, id });
  },
  delete: (id) => {
    if (!db) throw new Error("Database not initialized");
    return db.prepare("DELETE FROM subtasks WHERE id = ?").run(id);
  },
  deleteByTask: (taskId) => {
    if (!db) throw new Error("Database not initialized");
    return db.prepare("DELETE FROM subtasks WHERE task_id = ?").run(taskId);
  }
};
const tagsRepo = {
  addToTask: (taskId, tagName) => {
    if (!db) throw new Error("Database not initialized");
    db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(tagName);
    const tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName);
    return db.prepare("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)").run(taskId, tag.id);
  },
  removeFromTask: (taskId, tagName) => {
    if (!db) throw new Error("Database not initialized");
    const tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName);
    if (tag) {
      return db.prepare("DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?").run(taskId, tag.id);
    }
  }
};
const settingsRepo = {
  get: () => {
    if (!db) return {};
    const rows = db.prepare("SELECT * FROM settings").all();
    const settings = {};
    rows.forEach((row) => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });
    return settings;
  },
  set: (key, value) => {
    if (!db) throw new Error("Database not initialized");
    return db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
  }
};
const QUICK_ADD_QUERY = { quickadd: "1" };
const GLOBAL_SHORTCUT = "CommandOrControl+Shift+N";
const DEFAULT_PREFS = {
  launchAtLogin: false,
  startMinimized: false,
  closeToTray: true,
  rememberWindow: true,
  autoBackup: true
};
let mainWindow = null;
let quickAddWindow = null;
let tray = null;
let isQuitting = false;
let currentPrefs = { ...DEFAULT_PREFS };
let saveBoundsTimeout = null;
function getIconPath() {
  return {
    win: resolve(process.cwd(), "build/icon.ico"),
    other: resolve(process.cwd(), "build/icon.png")
  };
}
function loadTrayImage() {
  const { win, other } = getIconPath();
  const path = process.platform === "win32" ? win : other;
  try {
    return nativeImage.createFromPath(path);
  } catch {
    return nativeImage.createEmpty();
  }
}
function readStoredSettingsRecord() {
  try {
    const all = settingsRepo.get();
    const blob = all.settings;
    if (blob && typeof blob === "object" && !Array.isArray(blob)) {
      return blob;
    }
  } catch {
  }
  return {};
}
function mergeAppPrefs(raw) {
  const r = raw ?? {};
  return {
    launchAtLogin: typeof r.launchAtLogin === "boolean" ? r.launchAtLogin : DEFAULT_PREFS.launchAtLogin,
    startMinimized: typeof r.startMinimized === "boolean" ? r.startMinimized : DEFAULT_PREFS.startMinimized,
    closeToTray: typeof r.closeToTray === "boolean" ? r.closeToTray : DEFAULT_PREFS.closeToTray,
    rememberWindow: typeof r.rememberWindow === "boolean" ? r.rememberWindow : DEFAULT_PREFS.rememberWindow,
    autoBackup: typeof r.autoBackup === "boolean" ? r.autoBackup : DEFAULT_PREFS.autoBackup
  };
}
function refreshPrefsFromDb() {
  currentPrefs = mergeAppPrefs(readStoredSettingsRecord());
}
function applyLaunchAtLogin(enabled) {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: enabled ? ["--was-opened-at-login"] : []
    });
  } catch (e) {
    console.error("setLoginItemSettings failed:", e);
  }
}
function readSavedWindowBounds() {
  try {
    const all = settingsRepo.get();
    const b = all.windowBounds;
    if (!b || typeof b !== "object" || Array.isArray(b)) return null;
    const o = b;
    const x = typeof o.x === "number" ? o.x : void 0;
    const y = typeof o.y === "number" ? o.y : void 0;
    const width = typeof o.width === "number" ? o.width : void 0;
    const height = typeof o.height === "number" ? o.height : void 0;
    if (width === void 0 || height === void 0) return null;
    return { x, y, width, height };
  } catch {
    return null;
  }
}
function boundsAreOnScreen(bounds) {
  const displays = screen.getAllDisplays();
  const ax1 = bounds.x;
  const ay1 = bounds.y;
  const ax2 = bounds.x + bounds.width;
  const ay2 = bounds.y + bounds.height;
  const minVisible = 80;
  for (const d of displays) {
    const { x, y, width, height } = d.workArea;
    const ix1 = Math.max(ax1, x);
    const iy1 = Math.max(ay1, y);
    const ix2 = Math.min(ax2, x + width);
    const iy2 = Math.min(ay2, y + height);
    if (ix2 - ix1 >= minVisible && iy2 - iy1 >= minVisible) return true;
  }
  return false;
}
function getMainWindowBounds() {
  const defaults = { width: 1100, height: 750 };
  if (!currentPrefs.rememberWindow) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return {
      x: Math.round((width - defaults.width) / 2),
      y: Math.round((height - defaults.height) / 2),
      width: defaults.width,
      height: defaults.height
    };
  }
  const saved = readSavedWindowBounds();
  if (!saved || saved.width === void 0 || saved.height === void 0) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return {
      x: Math.round((width - defaults.width) / 2),
      y: Math.round((height - defaults.height) / 2),
      width: defaults.width,
      height: defaults.height
    };
  }
  const rect = {
    x: saved.x ?? 0,
    y: saved.y ?? 0,
    width: saved.width,
    height: saved.height
  };
  if (rect.width < 400 || rect.height < 300 || !boundsAreOnScreen(rect)) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return {
      x: Math.round((width - defaults.width) / 2),
      y: Math.round((height - defaults.height) / 2),
      width: defaults.width,
      height: defaults.height
    };
  }
  return rect;
}
function scheduleSaveMainWindowBounds() {
  if (!currentPrefs.rememberWindow || !mainWindow || mainWindow.isDestroyed()) return;
  if (saveBoundsTimeout) clearTimeout(saveBoundsTimeout);
  saveBoundsTimeout = setTimeout(() => {
    saveBoundsTimeout = null;
    if (!mainWindow || mainWindow.isDestroyed() || !currentPrefs.rememberWindow) return;
    try {
      const b = mainWindow.getBounds();
      settingsRepo.set("windowBounds", { x: b.x, y: b.y, width: b.width, height: b.height });
    } catch (e) {
      console.error("save window bounds failed:", e);
    }
  }, 400);
}
function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
function shouldUseTray() {
  return currentPrefs.closeToTray || currentPrefs.startMinimized;
}
function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Show TaskOverflow",
      click: () => showMainWindow()
    },
    {
      label: "Quick Add",
      click: () => openOrFocusQuickAdd()
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
}
function ensureTray() {
  if (!shouldUseTray()) {
    destroyTray();
    return;
  }
  if (tray) {
    tray.setContextMenu(buildTrayMenu());
    return;
  }
  const img = loadTrayImage();
  tray = new Tray(img);
  tray.setToolTip("TaskOverflow");
  tray.setContextMenu(buildTrayMenu());
  tray.on("click", () => showMainWindow());
}
function attachMainWindowListeners(win) {
  win.on("resize", () => scheduleSaveMainWindowBounds());
  win.on("move", () => scheduleSaveMainWindowBounds());
  win.on("close", (e) => {
    if (isQuitting) return;
    if (currentPrefs.closeToTray) {
      e.preventDefault();
      win.hide();
      if (process.platform === "darwin") {
        app.dock?.hide?.();
      }
    }
  });
  win.on("show", () => {
    if (process.platform === "darwin") {
      app.dock?.show?.();
    }
  });
  win.once("ready-to-show", () => {
    if (!currentPrefs.startMinimized) {
      win.show();
    } else {
      win.hide();
      if (process.platform === "darwin") {
        app.dock?.hide?.();
      }
    }
  });
}
function loadMainWindowUrl(win) {
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
function createMainWindow() {
  const iconPath = process.platform === "win32" ? getIconPath().win : getIconPath().other;
  const bounds = getMainWindowBounds();
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 15, y: 15 },
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false
    }
  });
  mainWindow = win;
  attachMainWindowListeners(win);
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  loadMainWindowUrl(win);
}
function loadQuickAddUrl(win) {
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    const base = process.env["ELECTRON_RENDERER_URL"];
    const u = new URL(base);
    u.searchParams.set("quickadd", "1");
    win.loadURL(u.toString());
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"), { query: QUICK_ADD_QUERY });
  }
}
function createQuickAddWindow() {
  const iconPath = process.platform === "win32" ? getIconPath().win : getIconPath().other;
  const win = new BrowserWindow({
    width: 440,
    height: 148,
    show: false,
    resizable: false,
    maximizable: false,
    minimizable: true,
    autoHideMenuBar: true,
    title: "Quick Add — TaskOverflow",
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false
    }
  });
  win.on("closed", () => {
    if (quickAddWindow === win) quickAddWindow = null;
  });
  return win;
}
function openOrFocusQuickAdd() {
  const showAndPing = (w2) => {
    w2.show();
    w2.focus();
    w2.webContents.send("quickadd:prepare");
  };
  if (!quickAddWindow || quickAddWindow.isDestroyed()) {
    const w2 = createQuickAddWindow();
    quickAddWindow = w2;
    w2.webContents.once("did-finish-load", () => showAndPing(w2));
    loadQuickAddUrl(w2);
    return;
  }
  const w = quickAddWindow;
  if (w.webContents.isLoading()) {
    w.webContents.once("did-finish-load", () => showAndPing(w));
  } else {
    showAndPing(w);
  }
}
function registerGlobalShortcuts() {
  globalShortcut.unregister(GLOBAL_SHORTCUT);
  try {
    const ok = globalShortcut.register(GLOBAL_SHORTCUT, () => openOrFocusQuickAdd());
    if (!ok) {
      console.warn("Global shortcut registration failed:", GLOBAL_SHORTCUT);
    }
  } catch (e) {
    console.error("Global shortcut error:", e);
  }
}
function runDailyAutoBackup() {
  if (!currentPrefs.autoBackup) return;
  const dbPath = getDbFilePath();
  if (!existsSync(dbPath)) return;
  const backupRoot = join(app.getPath("userData"), "backups");
  if (!existsSync(backupRoot)) {
    mkdirSync(backupRoot, { recursive: true });
  }
  const d = /* @__PURE__ */ new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dest = join(backupRoot, `taskoverflow-${stamp}.db`);
  if (existsSync(dest)) return;
  try {
    checkpointDbForBackup();
    copyFileSync(dbPath, dest);
  } catch (e) {
    console.error("Auto-backup failed:", e);
  }
}
function applyPrefsSideEffects() {
  applyLaunchAtLogin(currentPrefs.launchAtLogin);
  ensureTray();
}
function syncPrefsAfterSettingsSave(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  currentPrefs = mergeAppPrefs(value);
  applyPrefsSideEffects();
  runDailyAutoBackup();
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!shouldUseTray() && !mainWindow.isVisible()) {
      mainWindow.show();
      if (process.platform === "darwin") app.dock?.show?.();
    }
  }
}
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showMainWindow();
  });
  app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.taskoverflow");
    if (process.platform === "darwin") {
      app.dock.setIcon(resolve(process.cwd(), "build/icon.png"));
    }
    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });
    initDb();
    refreshPrefsFromDb();
    applyPrefsSideEffects();
    registerGlobalShortcuts();
    ipcMain.handle("db:getInitialState", () => {
      return {
        groups: groupsRepo.getAll(),
        tasks: tasksRepo.getAll(),
        settings: settingsRepo.get()
      };
    });
    ipcMain.handle("groups:create", (_, group) => groupsRepo.create(group));
    ipcMain.handle("groups:update", (_, id, patch) => groupsRepo.update(id, patch));
    ipcMain.handle("groups:delete", (_, id) => groupsRepo.delete(id));
    ipcMain.handle("groups:reorder", (_, ids) => groupsRepo.reorder(ids));
    ipcMain.handle("tasks:create", (_, task) => tasksRepo.create(task));
    ipcMain.handle("tasks:update", (_, id, patch) => tasksRepo.update(id, patch));
    ipcMain.handle("tasks:delete", (_, id) => tasksRepo.delete(id));
    ipcMain.handle("tasks:reorder", (_, groupId, ids) => tasksRepo.reorder(groupId, ids));
    ipcMain.handle("subtasks:add", (_, taskId, subtask) => subtasksRepo.add(taskId, subtask));
    ipcMain.handle("subtasks:update", (_, id, patch) => subtasksRepo.update(id, patch));
    ipcMain.handle("subtasks:delete", (_, id) => subtasksRepo.delete(id));
    ipcMain.handle("tags:addToTask", (_, taskId, tag) => tagsRepo.addToTask(taskId, tag));
    ipcMain.handle("tags:removeFromTask", (_, taskId, tag) => tagsRepo.removeFromTask(taskId, tag));
    ipcMain.handle("settings:save", (_, key, value) => {
      settingsRepo.set(key, value);
      if (key === "settings") {
        syncPrefsAfterSettingsSave(value);
      }
    });
    ipcMain.handle("paths:getData", () => {
      const dbFile = getDbFilePath();
      let dbSizeKb = null;
      try {
        if (existsSync(dbFile)) {
          dbSizeKb = Math.max(1, Math.round(statSync(dbFile).size / 1024));
        }
      } catch {
      }
      return {
        userData: app.getPath("userData"),
        dbFile,
        dbSizeKb
      };
    });
    ipcMain.handle("paths:revealDb", () => {
      shell.showItemInFolder(getDbFilePath());
    });
    ipcMain.handle("windows:closeQuickAdd", () => {
      if (quickAddWindow && !quickAddWindow.isDestroyed()) {
        quickAddWindow.hide();
      }
    });
    ipcMain.handle("app:broadcastStateReload", () => {
      for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) {
          w.webContents.send("app:reload-state");
        }
      }
    });
    createMainWindow();
    ensureTray();
    runDailyAutoBackup();
    setInterval(runDailyAutoBackup, 6 * 60 * 60 * 1e3);
    app.on("activate", function() {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      } else {
        showMainWindow();
      }
    });
  });
  app.on("before-quit", () => {
    isQuitting = true;
    globalShortcut.unregisterAll();
    destroyTray();
    closeDb();
  });
  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      if (!currentPrefs.closeToTray) {
        app.quit();
      }
    }
  });
}
