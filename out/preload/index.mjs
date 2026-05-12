import { contextBridge, ipcRenderer } from "electron";
import { exposeElectronAPI } from "@electron-toolkit/preload";
const api = {
  getInitialState: () => ipcRenderer.invoke("db:getInitialState"),
  // Groups
  createGroup: (group) => ipcRenderer.invoke("groups:create", group),
  updateGroup: (id, patch) => ipcRenderer.invoke("groups:update", id, patch),
  deleteGroup: (id) => ipcRenderer.invoke("groups:delete", id),
  reorderGroups: (ids) => ipcRenderer.invoke("groups:reorder", ids),
  // Tasks
  createTask: (task) => ipcRenderer.invoke("tasks:create", task),
  updateTask: (id, patch) => ipcRenderer.invoke("tasks:update", id, patch),
  deleteTask: (id) => ipcRenderer.invoke("tasks:delete", id),
  reorderTasks: (groupId, ids) => ipcRenderer.invoke("tasks:reorder", groupId, ids),
  // Subtasks
  addSubtask: (taskId, subtask) => ipcRenderer.invoke("subtasks:add", taskId, subtask),
  updateSubtask: (id, patch) => ipcRenderer.invoke("subtasks:update", id, patch),
  deleteSubtask: (id) => ipcRenderer.invoke("subtasks:delete", id),
  // Tags
  addTagToTask: (taskId, tag) => ipcRenderer.invoke("tags:addToTask", taskId, tag),
  removeTagFromTask: (taskId, tag) => ipcRenderer.invoke("tags:removeFromTask", taskId, tag),
  // Settings
  saveSetting: (key, value) => ipcRenderer.invoke("settings:save", key, value)
};
if (process.contextIsolated) {
  try {
    exposeElectronAPI();
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
