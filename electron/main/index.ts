import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join, resolve } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { initDb, groupsRepo, tasksRepo, subtasksRepo, tagsRepo, settingsRepo } from './db';

function createWindow(): void {
  const iconPath =
    process.platform === 'win32'
      ? resolve(process.cwd(), 'build/icon.ico')
      : resolve(process.cwd(), 'build/icon.png');

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.taskoverflow');

  if (process.platform === 'darwin') {
    app.dock.setIcon(resolve(process.cwd(), 'build/icon.png'));
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  initDb();

  // IPC Handlers
  ipcMain.handle('db:getInitialState', () => {
    return {
      groups: groupsRepo.getAll(),
      tasks: tasksRepo.getAll(),
      settings: settingsRepo.get()
    };
  });

  // Groups
  ipcMain.handle('groups:create', (_, group) => groupsRepo.create(group));
  ipcMain.handle('groups:update', (_, id, patch) => groupsRepo.update(id, patch));
  ipcMain.handle('groups:delete', (_, id) => groupsRepo.delete(id));
  ipcMain.handle('groups:reorder', (_, ids) => groupsRepo.reorder(ids));

  // Tasks
  ipcMain.handle('tasks:create', (_, task) => tasksRepo.create(task));
  ipcMain.handle('tasks:update', (_, id, patch) => tasksRepo.update(id, patch));
  ipcMain.handle('tasks:delete', (_, id) => tasksRepo.delete(id));
  ipcMain.handle('tasks:reorder', (_, groupId, ids) => tasksRepo.reorder(groupId, ids));

  // Subtasks
  ipcMain.handle('subtasks:add', (_, taskId, subtask) => subtasksRepo.add(taskId, subtask));
  ipcMain.handle('subtasks:update', (_, id, patch) => subtasksRepo.update(id, patch));
  ipcMain.handle('subtasks:delete', (_, id) => subtasksRepo.delete(id));

  // Tags
  ipcMain.handle('tags:addToTask', (_, taskId, tag) => tagsRepo.addToTask(taskId, tag));
  ipcMain.handle('tags:removeFromTask', (_, taskId, tag) => tagsRepo.removeFromTask(taskId, tag));

  // Settings
  ipcMain.handle('settings:save', (_, key, value) => settingsRepo.set(key, value));

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
