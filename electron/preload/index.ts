import { contextBridge, ipcRenderer } from 'electron';
import { exposeElectronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {
  getInitialState: () => ipcRenderer.invoke('db:getInitialState'),

  // Groups
  createGroup: (group: any) => ipcRenderer.invoke('groups:create', group),
  updateGroup: (id: string, patch: any) => ipcRenderer.invoke('groups:update', id, patch),
  deleteGroup: (id: string) => ipcRenderer.invoke('groups:delete', id),
  reorderGroups: (ids: string[]) => ipcRenderer.invoke('groups:reorder', ids),

  // Tasks
  createTask: (task: any) => ipcRenderer.invoke('tasks:create', task),
  updateTask: (id: string, patch: any) => ipcRenderer.invoke('tasks:update', id, patch),
  deleteTask: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  reorderTasks: (groupId: string, ids: string[]) => ipcRenderer.invoke('tasks:reorder', groupId, ids),

  // Subtasks
  addSubtask: (taskId: string, subtask: any) => ipcRenderer.invoke('subtasks:add', taskId, subtask),
  updateSubtask: (id: string, patch: any) => ipcRenderer.invoke('subtasks:update', id, patch),
  deleteSubtask: (id: string) => ipcRenderer.invoke('subtasks:delete', id),

  // Tags
  addTagToTask: (taskId: string, tag: string) => ipcRenderer.invoke('tags:addToTask', taskId, tag),
  removeTagFromTask: (taskId: string, tag: string) => ipcRenderer.invoke('tags:removeFromTask', taskId, tag),

  // Settings
  saveSetting: (key: string, value: any) => ipcRenderer.invoke('settings:save', key, value)
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    exposeElectronAPI();
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI;
  // @ts-ignore (define in d.ts)
  window.api = api;
}
