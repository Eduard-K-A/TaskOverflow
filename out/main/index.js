"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const utils = require("@electron-toolkit/utils");
const Database = require("better-sqlite3");
let db;
function getDbFilePath() {
  return path.join(electron.app.getPath("userData"), "taskoverflow.db");
}
function initDb() {
  const userDataPath = electron.app.getPath("userData");
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
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
const maintenanceRepo = {
  /**
   * Erase all user content. Groups cascade to tasks, subtasks and task_tags,
   * but tag names and settings live outside that chain and are cleared here.
   */
  wipeAll: () => {
    if (!db) throw new Error("Database not initialized");
    const database = db;
    const transaction = database.transaction(() => {
      database.prepare("DELETE FROM task_tags").run();
      database.prepare("DELETE FROM subtasks").run();
      database.prepare("DELETE FROM tasks").run();
      database.prepare("DELETE FROM groups").run();
      database.prepare("DELETE FROM tags").run();
      database.prepare("DELETE FROM settings").run();
    });
    transaction();
  }
};
const TRAY_ICON_32 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAA/xJREFUWIW1V02IHEUU/qq3N7sayczOBoKSMeCC7MVdEVeGhCwKIZpoFIUcBFFBvAWEXOLFgxICG0hQbyIYxYsnPQiiaBASwrqCOqteQqLozuyQuOzubAwbf6bf56Gruqu6q6cnon2Y6q5679X73ntfvRoF69kxNbV1eHPoiFJqj5DTCrhTKAAAUqAAiOiR1KO4oxAKBElAy0NhicJFKFxYvy18HZcv/2n2VOalfvd9ewm8D2JXrEyABC1joH7X8/E3AIgWT+dj8VQe2g7BS4p4YX2ldT5xYNfkzO4ois4DCFiIrAC5CJTKI6eJnEjijDUvkZLZ33/rXFA7pqa2bvljeJHkhIscAEWD8SAviEiyCWFFKY1A6gx/Gh2KpsMtN8LDRLy5QWjnPB3pjMjUhtlcLHkoJhFLNk8jMrFJdTgE0HA9zHoKd54AYSHMhpeWfC4trj0IG4GADZVZVMZT+pRFI9Uht5AjiYxHT8QDko1QkZM5BPAgd4xl5wXqpvUICiYDIUdoVy37IU+VE+QinvUMcq89Aooj4SA537dvFseOvoRqpaJPDVq/+afb7eLE3Cl8+tnnnoi4+6nb77qHZTw/+8lHOPryK1hbW3Op5uU5URsfw5unT2LvQ/u96bL1wkFyXqluw+rqKlqtdr5WPDwXiVCpVPI590Q6KMp5Ws2mut1qN0YlozccholsPq35mghc5IbHNp9hGdPzBlnC89ipH5tfY/v4uKdw82ky88F/xfMfvlvA/gOHsNzpuIVawobA62GmcKC7VuOBGYyOjrgR05s/fOBxtNsdf8F5kJv1IB+uIp4T8wsLmD/3Ber1nYnR77/9Co8cfALt5Y5bQyYOJSdqYHKu6DvhTEEaY8S9M3vw8YcfoF7ficVv5nHwsSfRai9byBj3ihLkpsZCUvdzxgWV5bkv59P378Z777yFRw89haVWu9jpPsiNU6Ev59meYCzays8+/2LfE85F7rNLKwJweZ7t57DWfSefr9oTt3PIXf0wJ+Tp592NDdRqtYSaWeRp2uKfsdoY1rvr+Zx77g9hFjk81DkxdwpvnJ7DWLWK7EPPW7e7gVdfO94XuflW2++Y4EB3OA/y/uslPUPPh+ZWSwqgCnJalnPvehFy08r1OaAULsYssNnQj8dl6/le4q2xuF4uBhQ2B7/DlZ/tjnNkQUTMnxQ0AwLNPAJfT7hZ5Bk9euxG0gxCwbsArpQjGxT5YHdKkldFemeClZVfrkgUPfO/59yNqAQKTwO4GgDAxury2QjRLMhf/33Os+sFt2XhpUDhwV6v9yUADEE/f21eX6puu/XtvyNcA3iDwC2gVPzI/T3Dx/OYclwCcI4iZ0R6z4nIz2bffwD3qYCCk4GuNwAAAABJRU5ErkJggg==";
const TRAY_ICON_64 = "data:image/png;base64,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";
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});
const QUICK_ADD_QUERY = { quickadd: "1" };
const GLOBAL_SHORTCUT = "CommandOrControl+Shift+N";
const REPO_URL = "https://github.com/Eduard-K-A/TaskOverflow";
const RELEASES_URL = `${REPO_URL}/releases`;
const LATEST_RELEASE_API = "https://api.github.com/repos/Eduard-K-A/TaskOverflow/releases/latest";
const EXTERNAL_URL_ALLOWLIST = /* @__PURE__ */ new Set([REPO_URL, RELEASES_URL]);
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
    win: path.resolve(process.cwd(), "build/icon.ico"),
    other: path.resolve(process.cwd(), "build/icon.png")
  };
}
function loadTrayImage() {
  try {
    const image = electron.nativeImage.createFromDataURL(TRAY_ICON_32);
    if (image.isEmpty()) return electron.nativeImage.createEmpty();
    image.addRepresentation({
      scaleFactor: 2,
      dataURL: TRAY_ICON_64
    });
    return image;
  } catch (e) {
    console.error("Tray icon load failed:", e);
    return electron.nativeImage.createEmpty();
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
    electron.app.setLoginItemSettings({
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
  const displays = electron.screen.getAllDisplays();
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
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
    return {
      x: Math.round((width - defaults.width) / 2),
      y: Math.round((height - defaults.height) / 2),
      width: defaults.width,
      height: defaults.height
    };
  }
  const saved = readSavedWindowBounds();
  if (!saved || saved.width === void 0 || saved.height === void 0) {
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
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
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
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
  return electron.Menu.buildFromTemplate([
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
        electron.app.quit();
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
  tray = new electron.Tray(img);
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
        electron.app.dock?.hide?.();
      }
    }
  });
  win.on("show", () => {
    if (process.platform === "darwin") {
      electron.app.dock?.show?.();
    }
  });
  win.once("ready-to-show", () => {
    if (!currentPrefs.startMinimized) {
      win.show();
    } else {
      win.hide();
      if (process.platform === "darwin") {
        electron.app.dock?.hide?.();
      }
    }
  });
}
function loadMainWindowUrl(win) {
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    console.log("[MAIN] Loading renderer from dev server:", process.env["ELECTRON_RENDERER_URL"]);
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    const filePath = path.join(__dirname, "../renderer/index.html");
    console.log("[MAIN] Loading renderer from file:", filePath);
    win.loadFile(filePath);
  }
}
function createMainWindow() {
  const iconPath = process.platform === "win32" ? getIconPath().win : getIconPath().other;
  const bounds = getMainWindowBounds();
  console.log("[MAIN] Creating window with bounds:", bounds);
  const isMac = process.platform === "darwin";
  const win = new electron.BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: true,
    autoHideMenuBar: true,
    ...isMac ? { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 15, y: 15 } } : {},
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  console.log("[MAIN] BrowserWindow created, id:", win.id);
  mainWindow = win;
  attachMainWindowListeners(win);
  win.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[RENDERER] did-fail-load", { code, desc, url });
  });
  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[RENDERER] render-process-gone", details);
  });
  win.webContents.on("did-finish-load", () => {
    console.log("[RENDERER] did-finish-load — page loaded successfully");
  });
  loadMainWindowUrl(win);
}
function loadQuickAddUrl(win) {
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    const base = process.env["ELECTRON_RENDERER_URL"];
    const u = new URL(base);
    u.searchParams.set("quickadd", "1");
    win.loadURL(u.toString());
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"), { query: QUICK_ADD_QUERY });
  }
}
function createQuickAddWindow() {
  const iconPath = process.platform === "win32" ? getIconPath().win : getIconPath().other;
  const win = new electron.BrowserWindow({
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
      preload: path.join(__dirname, "../preload/index.js"),
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
  electron.globalShortcut.unregister(GLOBAL_SHORTCUT);
  try {
    const ok = electron.globalShortcut.register(GLOBAL_SHORTCUT, () => openOrFocusQuickAdd());
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
  if (!fs.existsSync(dbPath)) return;
  const backupRoot = path.join(electron.app.getPath("userData"), "backups");
  if (!fs.existsSync(backupRoot)) {
    fs.mkdirSync(backupRoot, { recursive: true });
  }
  const d = /* @__PURE__ */ new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dest = path.join(backupRoot, `taskoverflow-${stamp}.db`);
  if (fs.existsSync(dest)) return;
  try {
    checkpointDbForBackup();
    fs.copyFileSync(dbPath, dest);
  } catch (e) {
    console.error("Auto-backup failed:", e);
  }
}
function compareVersions(a, b) {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
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
      if (process.platform === "darwin") electron.app.dock?.show?.();
    }
  }
}
const shouldLock = !utils.is.dev;
if (shouldLock && !electron.app.requestSingleInstanceLock()) {
  electron.app.quit();
} else {
  if (shouldLock) {
    electron.app.on("second-instance", () => {
      showMainWindow();
    });
  }
  electron.app.whenReady().then(() => {
    utils.electronApp.setAppUserModelId("com.taskoverflow");
    if (process.platform === "darwin") {
      electron.app.dock.setIcon(path.resolve(process.cwd(), "build/icon.png"));
    }
    electron.app.on("browser-window-created", (_, window) => {
      utils.optimizer.watchWindowShortcuts(window);
    });
    initDb();
    refreshPrefsFromDb();
    applyPrefsSideEffects();
    registerGlobalShortcuts();
    electron.ipcMain.handle("db:getInitialState", () => {
      return {
        groups: groupsRepo.getAll(),
        tasks: tasksRepo.getAll(),
        settings: settingsRepo.get()
      };
    });
    electron.ipcMain.handle("groups:create", (_, group) => groupsRepo.create(group));
    electron.ipcMain.handle("groups:update", (_, id, patch) => groupsRepo.update(id, patch));
    electron.ipcMain.handle("groups:delete", (_, id) => groupsRepo.delete(id));
    electron.ipcMain.handle("groups:reorder", (_, ids) => groupsRepo.reorder(ids));
    electron.ipcMain.handle("tasks:create", (_, task) => tasksRepo.create(task));
    electron.ipcMain.handle("tasks:update", (_, id, patch) => tasksRepo.update(id, patch));
    electron.ipcMain.handle("tasks:delete", (_, id) => tasksRepo.delete(id));
    electron.ipcMain.handle("tasks:reorder", (_, groupId, ids) => tasksRepo.reorder(groupId, ids));
    electron.ipcMain.handle("subtasks:add", (_, taskId, subtask) => subtasksRepo.add(taskId, subtask));
    electron.ipcMain.handle("subtasks:update", (_, id, patch) => subtasksRepo.update(id, patch));
    electron.ipcMain.handle("subtasks:delete", (_, id) => subtasksRepo.delete(id));
    electron.ipcMain.handle("tags:addToTask", (_, taskId, tag) => tagsRepo.addToTask(taskId, tag));
    electron.ipcMain.handle("tags:removeFromTask", (_, taskId, tag) => tagsRepo.removeFromTask(taskId, tag));
    electron.ipcMain.handle("settings:save", (_, key, value) => {
      settingsRepo.set(key, value);
      if (key === "settings") {
        syncPrefsAfterSettingsSave(value);
      }
    });
    electron.ipcMain.handle("paths:getData", () => {
      const dbFile = getDbFilePath();
      let dbSizeKb = null;
      try {
        if (fs.existsSync(dbFile)) {
          dbSizeKb = Math.max(1, Math.round(fs.statSync(dbFile).size / 1024));
        }
      } catch {
      }
      return {
        userData: electron.app.getPath("userData"),
        dbFile,
        dbSizeKb
      };
    });
    electron.ipcMain.handle("paths:revealDb", () => {
      electron.shell.showItemInFolder(getDbFilePath());
    });
    electron.ipcMain.handle("db:wipeAll", () => {
      maintenanceRepo.wipeAll();
      refreshPrefsFromDb();
      applyPrefsSideEffects();
    });
    electron.ipcMain.handle("app:getVersion", () => electron.app.getVersion());
    electron.ipcMain.handle("app:openExternal", (_, url) => {
      if (!EXTERNAL_URL_ALLOWLIST.has(url)) {
        throw new Error(`Refusing to open non-allowlisted URL: ${url}`);
      }
      return electron.shell.openExternal(url);
    });
    electron.ipcMain.handle("app:checkForUpdates", async () => {
      const current = electron.app.getVersion();
      try {
        const response = await fetch(LATEST_RELEASE_API, {
          headers: { Accept: "application/vnd.github+json" },
          signal: AbortSignal.timeout(8e3)
        });
        if (response.status === 404) {
          return { status: "no-releases", current, releasesUrl: RELEASES_URL };
        }
        if (!response.ok) {
          return { status: "error", current, releasesUrl: RELEASES_URL };
        }
        const body = await response.json();
        const latest = (body.tag_name ?? body.name ?? "").replace(/^v/, "");
        if (!latest) {
          return { status: "no-releases", current, releasesUrl: RELEASES_URL };
        }
        return {
          status: compareVersions(latest, current) > 0 ? "outdated" : "current",
          current,
          latest,
          releasesUrl: RELEASES_URL
        };
      } catch {
        return { status: "error", current, releasesUrl: RELEASES_URL };
      }
    });
    electron.ipcMain.handle("windows:closeQuickAdd", () => {
      if (quickAddWindow && !quickAddWindow.isDestroyed()) {
        quickAddWindow.hide();
      }
    });
    electron.ipcMain.handle("app:broadcastStateReload", () => {
      for (const w of electron.BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) {
          w.webContents.send("app:reload-state");
        }
      }
    });
    createMainWindow();
    ensureTray();
    runDailyAutoBackup();
    setInterval(runDailyAutoBackup, 6 * 60 * 60 * 1e3);
    electron.app.on("activate", function() {
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      } else {
        showMainWindow();
      }
    });
  });
  electron.app.on("before-quit", () => {
    isQuitting = true;
    electron.globalShortcut.unregisterAll();
    destroyTray();
    closeDb();
  });
  electron.app.on("will-quit", () => {
    electron.globalShortcut.unregisterAll();
  });
  electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      if (!currentPrefs.closeToTray) {
        electron.app.quit();
      }
    }
  });
}
