import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  screen
} from 'electron';
import { join, resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import {
  initDb,
  closeDb,
  checkpointDbForBackup,
  getDbFilePath,
  groupsRepo,
  tasksRepo,
  subtasksRepo,
  tagsRepo,
  settingsRepo
} from './db';

const QUICK_ADD_QUERY = { quickadd: '1' };
const GLOBAL_SHORTCUT = 'CommandOrControl+Shift+N';

interface AppPrefs {
  launchAtLogin: boolean;
  startMinimized: boolean;
  closeToTray: boolean;
  rememberWindow: boolean;
  autoBackup: boolean;
}

const DEFAULT_PREFS: AppPrefs = {
  launchAtLogin: false,
  startMinimized: false,
  closeToTray: true,
  rememberWindow: true,
  autoBackup: true
};

let mainWindow: BrowserWindow | null = null;
let quickAddWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let currentPrefs: AppPrefs = { ...DEFAULT_PREFS };
let saveBoundsTimeout: ReturnType<typeof setTimeout> | null = null;

function getIconPath(): { win: string; other: string } {
  return {
    win: resolve(process.cwd(), 'build/icon.ico'),
    other: resolve(process.cwd(), 'build/icon.png')
  };
}

function loadTrayImage(): nativeImage {
  const { win, other } = getIconPath();
  const path = process.platform === 'win32' ? win : other;
  try {
    return nativeImage.createFromPath(path);
  } catch {
    return nativeImage.createEmpty();
  }
}

function readStoredSettingsRecord(): Record<string, unknown> {
  try {
    const all = settingsRepo.get() as Record<string, unknown>;
    const blob = all.settings;
    if (blob && typeof blob === 'object' && !Array.isArray(blob)) {
      return blob as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function mergeAppPrefs(raw: Record<string, unknown> | null | undefined): AppPrefs {
  const r = raw ?? {};
  return {
    launchAtLogin: typeof r.launchAtLogin === 'boolean' ? r.launchAtLogin : DEFAULT_PREFS.launchAtLogin,
    startMinimized: typeof r.startMinimized === 'boolean' ? r.startMinimized : DEFAULT_PREFS.startMinimized,
    closeToTray: typeof r.closeToTray === 'boolean' ? r.closeToTray : DEFAULT_PREFS.closeToTray,
    rememberWindow: typeof r.rememberWindow === 'boolean' ? r.rememberWindow : DEFAULT_PREFS.rememberWindow,
    autoBackup: typeof r.autoBackup === 'boolean' ? r.autoBackup : DEFAULT_PREFS.autoBackup
  };
}

function refreshPrefsFromDb(): void {
  currentPrefs = mergeAppPrefs(readStoredSettingsRecord());
}

function applyLaunchAtLogin(enabled: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: enabled ? ['--was-opened-at-login'] : []
    });
  } catch (e) {
    console.error('setLoginItemSettings failed:', e);
  }
}

function readSavedWindowBounds(): { x?: number; y?: number; width?: number; height?: number } | null {
  try {
    const all = settingsRepo.get() as Record<string, unknown>;
    const b = all.windowBounds;
    if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
    const o = b as Record<string, unknown>;
    const x = typeof o.x === 'number' ? o.x : undefined;
    const y = typeof o.y === 'number' ? o.y : undefined;
    const width = typeof o.width === 'number' ? o.width : undefined;
    const height = typeof o.height === 'number' ? o.height : undefined;
    if (width === undefined || height === undefined) return null;
    return { x, y, width, height };
  } catch {
    return null;
  }
}

function boundsAreOnScreen(bounds: Electron.Rectangle): boolean {
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

function getMainWindowBounds(): Electron.Rectangle {
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
  if (!saved || saved.width === undefined || saved.height === undefined) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return {
      x: Math.round((width - defaults.width) / 2),
      y: Math.round((height - defaults.height) / 2),
      width: defaults.width,
      height: defaults.height
    };
  }
  const rect: Electron.Rectangle = {
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

function scheduleSaveMainWindowBounds(): void {
  if (!currentPrefs.rememberWindow || !mainWindow || mainWindow.isDestroyed()) return;
  if (saveBoundsTimeout) clearTimeout(saveBoundsTimeout);
  saveBoundsTimeout = setTimeout(() => {
    saveBoundsTimeout = null;
    if (!mainWindow || mainWindow.isDestroyed() || !currentPrefs.rememberWindow) return;
    try {
      const b = mainWindow.getBounds();
      settingsRepo.set('windowBounds', { x: b.x, y: b.y, width: b.width, height: b.height });
    } catch (e) {
      console.error('save window bounds failed:', e);
    }
  }, 400);
}

function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function shouldUseTray(): boolean {
  return currentPrefs.closeToTray || currentPrefs.startMinimized;
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show TaskOverflow',
      click: () => showMainWindow()
    },
    {
      label: 'Quick Add',
      click: () => openOrFocusQuickAdd()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
}

function ensureTray(): void {
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
  tray.setToolTip('TaskOverflow');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => showMainWindow());
}

function attachMainWindowListeners(win: BrowserWindow): void {
  win.on('resize', () => scheduleSaveMainWindowBounds());
  win.on('move', () => scheduleSaveMainWindowBounds());

  win.on('close', (e) => {
    if (isQuitting) return;
    if (currentPrefs.closeToTray) {
      e.preventDefault();
      win.hide();
      if (process.platform === 'darwin') {
        app.dock?.hide?.();
      }
    }
  });

  win.on('show', () => {
    if (process.platform === 'darwin') {
      app.dock?.show?.();
    }
  });

  win.once('ready-to-show', () => {
    if (!currentPrefs.startMinimized) {
      win.show();
    } else {
      win.hide();
      if (process.platform === 'darwin') {
        app.dock?.hide?.();
      }
    }
  });
}

function loadMainWindowUrl(win: BrowserWindow): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function createMainWindow(): void {
  const iconPath = process.platform === 'win32' ? getIconPath().win : getIconPath().other;
  const bounds = getMainWindowBounds();

  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  });

  mainWindow = win;
  attachMainWindowListeners(win);

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  loadMainWindowUrl(win);
}

function loadQuickAddUrl(win: BrowserWindow): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const base = process.env['ELECTRON_RENDERER_URL'];
    const u = new URL(base);
    u.searchParams.set('quickadd', '1');
    win.loadURL(u.toString());
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { query: QUICK_ADD_QUERY });
  }
}

function createQuickAddWindow(): BrowserWindow {
  const iconPath = process.platform === 'win32' ? getIconPath().win : getIconPath().other;
  const win = new BrowserWindow({
    width: 440,
    height: 148,
    show: false,
    resizable: false,
    maximizable: false,
    minimizable: true,
    autoHideMenuBar: true,
    title: 'Quick Add — TaskOverflow',
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  });

  win.on('closed', () => {
    if (quickAddWindow === win) quickAddWindow = null;
  });

  return win;
}

function openOrFocusQuickAdd(): void {
  const showAndPing = (w: BrowserWindow) => {
    w.show();
    w.focus();
    w.webContents.send('quickadd:prepare');
  };

  if (!quickAddWindow || quickAddWindow.isDestroyed()) {
    const w = createQuickAddWindow();
    quickAddWindow = w;
    w.webContents.once('did-finish-load', () => showAndPing(w));
    loadQuickAddUrl(w);
    return;
  }

  const w = quickAddWindow;
  if (w.webContents.isLoading()) {
    w.webContents.once('did-finish-load', () => showAndPing(w));
  } else {
    showAndPing(w);
  }
}

function registerGlobalShortcuts(): void {
  globalShortcut.unregister(GLOBAL_SHORTCUT);
  try {
    const ok = globalShortcut.register(GLOBAL_SHORTCUT, () => openOrFocusQuickAdd());
    if (!ok) {
      console.warn('Global shortcut registration failed:', GLOBAL_SHORTCUT);
    }
  } catch (e) {
    console.error('Global shortcut error:', e);
  }
}

function runDailyAutoBackup(): void {
  if (!currentPrefs.autoBackup) return;
  const dbPath = getDbFilePath();
  if (!existsSync(dbPath)) return;
  const backupRoot = join(app.getPath('userData'), 'backups');
  if (!existsSync(backupRoot)) {
    mkdirSync(backupRoot, { recursive: true });
  }
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dest = join(backupRoot, `taskoverflow-${stamp}.db`);
  if (existsSync(dest)) return;
  try {
    checkpointDbForBackup();
    copyFileSync(dbPath, dest);
  } catch (e) {
    console.error('Auto-backup failed:', e);
  }
}

function applyPrefsSideEffects(): void {
  applyLaunchAtLogin(currentPrefs.launchAtLogin);
  ensureTray();
}

function syncPrefsAfterSettingsSave(value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  currentPrefs = mergeAppPrefs(value as Record<string, unknown>);
  applyPrefsSideEffects();
  runDailyAutoBackup();
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!shouldUseTray() && !mainWindow.isVisible()) {
      mainWindow.show();
      if (process.platform === 'darwin') app.dock?.show?.();
    }
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.taskoverflow');

    if (process.platform === 'darwin') {
      app.dock.setIcon(resolve(process.cwd(), 'build/icon.png'));
    }

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    initDb();
    refreshPrefsFromDb();
    applyPrefsSideEffects();
    registerGlobalShortcuts();

    ipcMain.handle('db:getInitialState', () => {
      return {
        groups: groupsRepo.getAll(),
        tasks: tasksRepo.getAll(),
        settings: settingsRepo.get()
      };
    });

    ipcMain.handle('groups:create', (_, group) => groupsRepo.create(group));
    ipcMain.handle('groups:update', (_, id, patch) => groupsRepo.update(id, patch));
    ipcMain.handle('groups:delete', (_, id) => groupsRepo.delete(id));
    ipcMain.handle('groups:reorder', (_, ids) => groupsRepo.reorder(ids));

    ipcMain.handle('tasks:create', (_, task) => tasksRepo.create(task));
    ipcMain.handle('tasks:update', (_, id, patch) => tasksRepo.update(id, patch));
    ipcMain.handle('tasks:delete', (_, id) => tasksRepo.delete(id));
    ipcMain.handle('tasks:reorder', (_, groupId, ids) => tasksRepo.reorder(groupId, ids));

    ipcMain.handle('subtasks:add', (_, taskId, subtask) => subtasksRepo.add(taskId, subtask));
    ipcMain.handle('subtasks:update', (_, id, patch) => subtasksRepo.update(id, patch));
    ipcMain.handle('subtasks:delete', (_, id) => subtasksRepo.delete(id));

    ipcMain.handle('tags:addToTask', (_, taskId, tag) => tagsRepo.addToTask(taskId, tag));
    ipcMain.handle('tags:removeFromTask', (_, taskId, tag) => tagsRepo.removeFromTask(taskId, tag));

    ipcMain.handle('settings:save', (_, key: string, value: unknown) => {
      settingsRepo.set(key, value);
      if (key === 'settings') {
        syncPrefsAfterSettingsSave(value);
      }
    });

    ipcMain.handle('paths:getData', () => {
      const dbFile = getDbFilePath();
      let dbSizeKb: number | null = null;
      try {
        if (existsSync(dbFile)) {
          dbSizeKb = Math.max(1, Math.round(statSync(dbFile).size / 1024));
        }
      } catch {
        /* ignore */
      }
      return {
        userData: app.getPath('userData'),
        dbFile,
        dbSizeKb
      };
    });

    ipcMain.handle('paths:revealDb', () => {
      shell.showItemInFolder(getDbFilePath());
    });

    ipcMain.handle('windows:closeQuickAdd', () => {
      if (quickAddWindow && !quickAddWindow.isDestroyed()) {
        quickAddWindow.hide();
      }
    });

    ipcMain.handle('app:broadcastStateReload', () => {
      for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) {
          w.webContents.send('app:reload-state');
        }
      }
    });

    createMainWindow();
    ensureTray();
    runDailyAutoBackup();
    setInterval(runDailyAutoBackup, 6 * 60 * 60 * 1000);

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      } else {
        showMainWindow();
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
    globalShortcut.unregisterAll();
    destroyTray();
    closeDb();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      if (!currentPrefs.closeToTray) {
        app.quit();
      }
    }
  });
}
