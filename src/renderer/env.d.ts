/// <reference types="vite/client" />
import { ElectronAPI } from '@electron-toolkit/preload'

declare module '*.svg' {
  const src: string
  export default src
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getInitialState: () => Promise<{ groups: any[]; tasks: any[]; settings: any }>;
      createGroup: (group: any) => Promise<void>;
      updateGroup: (id: string, patch: any) => Promise<void>;
      deleteGroup: (id: string) => Promise<void>;
      reorderGroups: (ids: string[]) => Promise<void>;
      createTask: (task: any) => Promise<void>;
      updateTask: (id: string, patch: any) => Promise<void>;
      deleteTask: (id: string) => Promise<void>;
      reorderTasks: (groupId: string, ids: string[]) => Promise<void>;
      addSubtask: (taskId: string, subtask: any) => Promise<void>;
      updateSubtask: (id: string, patch: any) => Promise<void>;
      deleteSubtask: (id: string) => Promise<void>;
      addTagToTask: (taskId: string, tag: string) => Promise<void>;
      removeTagFromTask: (taskId: string, tag: string) => Promise<void>;
      saveSetting: (key: string, value: any) => Promise<void>;
      getDataPaths: () => Promise<{ userData: string; dbFile: string; dbSizeKb: number | null }>;
      revealDbInFolder: () => Promise<void>;
      closeQuickAddWindow: () => Promise<void>;
      onQuickAddPrepare: (callback: () => void) => () => void;
      broadcastStateReload: () => Promise<void>;
      subscribeReloadState: (callback: () => void) => () => void;
    }
  }
}
