"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  getInitialState: () => electron.ipcRenderer.invoke("db:getInitialState"),
  // Groups
  createGroup: (group) => electron.ipcRenderer.invoke("groups:create", group),
  updateGroup: (id, patch) => electron.ipcRenderer.invoke("groups:update", id, patch),
  deleteGroup: (id) => electron.ipcRenderer.invoke("groups:delete", id),
  reorderGroups: (ids) => electron.ipcRenderer.invoke("groups:reorder", ids),
  // Tasks
  createTask: (task) => electron.ipcRenderer.invoke("tasks:create", task),
  updateTask: (id, patch) => electron.ipcRenderer.invoke("tasks:update", id, patch),
  deleteTask: (id) => electron.ipcRenderer.invoke("tasks:delete", id),
  reorderTasks: (groupId, ids) => electron.ipcRenderer.invoke("tasks:reorder", groupId, ids),
  // Subtasks
  addSubtask: (taskId, subtask) => electron.ipcRenderer.invoke("subtasks:add", taskId, subtask),
  updateSubtask: (id, patch) => electron.ipcRenderer.invoke("subtasks:update", id, patch),
  deleteSubtask: (id) => electron.ipcRenderer.invoke("subtasks:delete", id),
  // Tags
  addTagToTask: (taskId, tag) => electron.ipcRenderer.invoke("tags:addToTask", taskId, tag),
  removeTagFromTask: (taskId, tag) => electron.ipcRenderer.invoke("tags:removeFromTask", taskId, tag),
  // Settings
  saveSetting: (key, value) => electron.ipcRenderer.invoke("settings:save", key, value),
  getDataPaths: () => electron.ipcRenderer.invoke("paths:getData"),
  revealDbInFolder: () => electron.ipcRenderer.invoke("paths:revealDb"),
  closeQuickAddWindow: () => electron.ipcRenderer.invoke("windows:closeQuickAdd"),
  onQuickAddPrepare: (callback) => {
    const listener = () => {
      callback();
    };
    electron.ipcRenderer.on("quickadd:prepare", listener);
    return () => {
      electron.ipcRenderer.removeListener("quickadd:prepare", listener);
    };
  },
  broadcastStateReload: () => electron.ipcRenderer.invoke("app:broadcastStateReload"),
  subscribeReloadState: (callback) => {
    const listener = () => {
      callback();
    };
    electron.ipcRenderer.on("app:reload-state", listener);
    return () => {
      electron.ipcRenderer.removeListener("app:reload-state", listener);
    };
  }
};
if (process.contextIsolated) {
  try {
    preload.exposeElectronAPI();
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
