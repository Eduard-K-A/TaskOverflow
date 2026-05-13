import { create } from "zustand";
import type { Group, Task, Subtask, TaskStatus, AccentColor } from "../types";

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export type StatusFilter = "all" | TaskStatus | "overdue";

export type Density = "compact" | "comfortable" | "spacious";
export type DefaultDueDate = "none" | "today" | "tomorrow" | "next-week";

export interface Settings {
  density: Density;
  sidebarWidth: number;
  showCounts: boolean;
  moveCompletedDown: boolean;
  showCompleted: boolean;
  defaultDueDate: DefaultDueDate;
  confirmDelete: boolean;
  overdueRed: boolean;
  notificationsEnabled: boolean;
  remindBefore: string;
  notifSound: boolean;
  dndHours: string;
  autoBackup: boolean;
  launchAtLogin: boolean;
  startMinimized: boolean;
  closeToTray: boolean;
  rememberWindow: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  density: "comfortable",
  sidebarWidth: 264,
  showCounts: true,
  moveCompletedDown: false,
  showCompleted: true,
  defaultDueDate: "today",
  confirmDelete: true,
  overdueRed: true,
  notificationsEnabled: false,
  remindBefore: "30",
  notifSound: true,
  dndHours: "22-08",
  autoBackup: true,
  launchAtLogin: false,
  startMinimized: false,
  closeToTray: true,
  rememberWindow: true,
};

async function invokePersist(op: () => Promise<unknown>): Promise<void> {
  if (typeof window === "undefined" || !window.api) return;
  try {
    await op();
  } catch (err) {
    console.error("Persistence failed:", err);
  }
}

interface UIState {
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  activeGroupId: string | null;
  selectedTaskId: string | null;
  searchQuery: string;
  statusFilter: StatusFilter;
  tagFilter: string[];
  helpOpen: boolean;
  settingsOpen: boolean;
  groupDialog: { open: boolean; editingId: string | null };
  settings: Settings;
  isHydrated: boolean;
}

interface DataState {
  groups: Group[];
  tasks: Task[];
}

interface Actions {
  hydrate: () => Promise<void>;
  // UI
  setTheme: (t: UIState["theme"]) => void;
  toggleSidebar: () => void;
  setActiveGroup: (id: string | null) => Promise<void>;
  selectTask: (id: string | null) => void;
  setSearch: (q: string) => void;
  setStatusFilter: (s: StatusFilter) => void;
  toggleTagFilter: (tag: string) => void;
  clearFilters: () => void;
  setHelpOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  saveSettings: (next: Settings) => Promise<void>;
  resetSettings: () => Promise<void>;
  openGroupDialog: (editingId?: string | null) => void;
  closeGroupDialog: () => void;

  // Groups
  createGroup: (input: { name: string; emoji: string; accent: AccentColor }) => Promise<Group>;
  updateGroup: (id: string, patch: Partial<Pick<Group, "name" | "emoji" | "accent">>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  reorderGroups: (orderedIds: string[]) => Promise<void>;

  // Tasks
  createTask: (input: { groupId: string; title: string }) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  toggleTaskDone: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (groupId: string, orderedIds: string[]) => Promise<void>;

  // Subtasks
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  updateSubtask: (taskId: string, subtaskId: string, title: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;

  // Tags
  addTagToTask: (taskId: string, tag: string) => Promise<void>;
  removeTagFromTask: (taskId: string, tag: string) => Promise<void>;

  // Export
  exportGroup: (groupId: string, format: "json" | "csv") => void;
}

type Store = UIState & DataState & Actions;

export const useStore = create<Store>()((set, get) => ({
  theme: "system",
  sidebarCollapsed: false,
  activeGroupId: null,
  selectedTaskId: null,
  searchQuery: "",
  statusFilter: "all",
  tagFilter: [],
  helpOpen: false,
  settingsOpen: false,
  groupDialog: { open: false, editingId: null },
  settings: DEFAULT_SETTINGS,
  groups: [],
  tasks: [],
  isHydrated: false,

  hydrate: async () => {
    try {
      if (typeof window !== 'undefined' && window.api) {
        const { groups, tasks, settings: rawSettings } = await window.api.getInitialState();
        const { lastActiveGroupId, ...prefs } = rawSettings as Record<string, unknown>;
        const merged = { ...DEFAULT_SETTINGS, ...prefs } as Settings;
        const preferred =
          typeof lastActiveGroupId === 'string' &&
          lastActiveGroupId.length > 0 &&
          groups.some((g) => g.id === lastActiveGroupId)
            ? lastActiveGroupId
            : null;
        set({
          groups,
          tasks,
          settings: merged,
          activeGroupId: preferred ?? groups[0]?.id ?? null,
          isHydrated: true
        });
        return;
      }

      // Fall back to an empty in-memory state if the Electron bridge is unavailable.
      set({
        groups: [],
        tasks: [],
        settings: DEFAULT_SETTINGS,
        activeGroupId: null,
        isHydrated: true
      });
    } catch (error) {
      console.error('Failed to hydrate app state:', error);
      set({
        groups: [],
        tasks: [],
        settings: DEFAULT_SETTINGS,
        activeGroupId: null,
        isHydrated: true
      });
    }
  },

  setTheme: (theme) => {
    set({ theme });
    void invokePersist(() => window.api!.saveSetting('theme', theme));
  },
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    void invokePersist(() => window.api!.saveSetting('sidebarCollapsed', next));
  },
  setActiveGroup: async (id) => {
    set({ activeGroupId: id, selectedTaskId: null });
    await invokePersist(() => window.api!.saveSetting('lastActiveGroupId', id ?? ''));
  },
  selectTask: (id) => set({ selectedTaskId: id }),
  setSearch: (q) => set({ searchQuery: q }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  toggleTagFilter: (tag) =>
    set((s) => ({
      tagFilter: s.tagFilter.includes(tag)
        ? s.tagFilter.filter((t) => t !== tag)
        : [...s.tagFilter, tag],
    })),
  clearFilters: () => set({ statusFilter: "all", tagFilter: [], searchQuery: "" }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  saveSettings: async (settings) => {
    set({ settings });
    await invokePersist(() => window.api!.saveSetting('settings', settings));
  },
  resetSettings: async () => {
    set({ settings: DEFAULT_SETTINGS });
    await invokePersist(() => window.api!.saveSetting('settings', DEFAULT_SETTINGS));
  },
  openGroupDialog: (editingId = null) => set({ groupDialog: { open: true, editingId } }),
  closeGroupDialog: () => set({ groupDialog: { open: false, editingId: null } }),

  createGroup: async ({ name, emoji, accent }) => {
    const group: Group = {
      id: uid(),
      name,
      emoji,
      accent,
      position: get().groups.length,
      createdAt: Date.now(),
    };
    set((s) => ({ groups: [...s.groups, group], activeGroupId: group.id }));
    await invokePersist(() => window.api!.createGroup(group));
    await invokePersist(() => window.api!.saveSetting('lastActiveGroupId', group.id));
    return group;
  },
  updateGroup: async (id, patch) => {
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
    await invokePersist(() => window.api!.updateGroup(id, patch));
  },
  deleteGroup: async (id) => {
    set((s) => {
      const groups = s.groups.filter((g) => g.id !== id);
      const tasks = s.tasks.filter((t) => t.groupId !== id);
      const activeGroupId =
        s.activeGroupId === id ? groups[0]?.id ?? null : s.activeGroupId;
      return { groups, tasks, activeGroupId };
    });
    await invokePersist(() => window.api!.deleteGroup(id));
    const next = get().activeGroupId;
    await invokePersist(() => window.api!.saveSetting('lastActiveGroupId', next ?? ''));
  },
  reorderGroups: async (orderedIds) => {
    set((s) => ({
      groups: orderedIds
        .map((id, i) => {
          const g = s.groups.find((x) => x.id === id);
          return g ? { ...g, position: i } : null;
        })
        .filter((g): g is Group => g !== null),
    }));
    await invokePersist(() => window.api!.reorderGroups(orderedIds));
  },

  createTask: async ({ groupId, title }) => {
    const existing = get().tasks.filter((t) => t.groupId === groupId);
    const pref = get().settings.defaultDueDate;
    let due: string | null = null;
    if (pref !== "none") {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      if (pref === "tomorrow") d.setDate(d.getDate() + 1);
      if (pref === "next-week") d.setDate(d.getDate() + 7);
      due = d.toISOString();
    }
    const task: Task = {
      id: uid(),
      groupId,
      title,
      notes: "",
      status: "todo",
      dueDate: due,
      tags: [],
      subtasks: [],
      position: existing.length,
      createdAt: Date.now(),
      completedAt: null,
    };
    set((s) => ({ tasks: [...s.tasks, task] }));
    await invokePersist(() => window.api!.createTask(task));
    return task;
  },
  updateTask: async (id, patch) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    await invokePersist(() => window.api!.updateTask(id, patch));
  },
  toggleTaskDone: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    const isDone = task.status === "done";
    const patch = isDone 
      ? { status: "todo" as const, completedAt: null } 
      : { status: "done" as const, completedAt: Date.now() };
    
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    }));
    await invokePersist(() => window.api!.updateTask(id, patch));
  },
  deleteTask: async (id) => {
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
    }));
    await invokePersist(() => window.api!.deleteTask(id));
  },
  reorderTasks: async (groupId, orderedIds) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.groupId !== groupId) return t;
        const idx = orderedIds.indexOf(t.id);
        return idx === -1 ? t : { ...t, position: idx };
      }),
    }));
    await invokePersist(() => window.api!.reorderTasks(groupId, orderedIds));
  },

  addSubtask: async (taskId, title) => {
    const subtask = { id: uid(), title, done: false, position: 0 };
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, subtask] }
          : t,
      ),
    }));
    await invokePersist(() => window.api!.addSubtask(taskId, subtask));
  },
  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    const subtask = task?.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;

    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((st) =>
                st.id === subtaskId ? { ...st, done: !st.done } : st,
              ),
            }
          : t,
      ),
    }));
    await invokePersist(() => window.api!.updateSubtask(subtaskId, { done: !subtask.done }));
  },
  updateSubtask: async (taskId, subtaskId, title) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((st: Subtask) =>
                st.id === subtaskId ? { ...st, title } : st,
              ),
            }
          : t,
      ),
    }));
    await invokePersist(() => window.api!.updateSubtask(subtaskId, { title }));
  },
  deleteSubtask: async (taskId, subtaskId) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== subtaskId) }
          : t,
      ),
    }));
    await invokePersist(() => window.api!.deleteSubtask(subtaskId));
  },

  addTagToTask: async (taskId, tag) => {
    const clean = tag.trim().toLowerCase();
    if (!clean) return;
    const task = get().tasks.find(t => t.id === taskId);
    if (task && !task.tags.includes(clean)) {
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, tags: [...t.tags, clean] } : t,
        ),
      }));
      await invokePersist(() => window.api!.addTagToTask(taskId, clean));
    }
  },
  removeTagFromTask: async (taskId, tag) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, tags: t.tags.filter((x) => x !== tag) } : t,
      ),
    }));
    await invokePersist(() => window.api!.removeTagFromTask(taskId, tag));
  },

  exportGroup: (groupId, format) => {
    const { groups, tasks } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const groupTasks = tasks
      .filter((t) => t.groupId === groupId)
      .sort((a, b) => a.position - b.position);
    let content: string;
    let mime: string;
    let ext: string;
    if (format === "json") {
      content = JSON.stringify({ group, tasks: groupTasks }, null, 2);
      mime = "application/json";
      ext = "json";
    } else {
      const headers = ["id", "title", "status", "due_date", "tags", "notes"];
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const rows = groupTasks.map((t) =>
        [t.id, t.title, t.status, t.dueDate ?? "", t.tags.join("|"), t.notes]
          .map((v) => escape(String(v)))
          .join(","),
      );
      content = [headers.join(","), ...rows].join("\n");
      mime = "text/csv";
      ext = "csv";
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${group.name.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
}));

export const selectActiveGroup = (s: Store): Group | null =>
  s.groups.find((g) => g.id === s.activeGroupId) ?? null;

export const selectVisibleTasks = (s: Store): Task[] => {
  if (!s.activeGroupId) return [];
  const q = s.searchQuery.trim().toLowerCase();
  return s.tasks
    .filter((t) => t.groupId === s.activeGroupId)
    .filter((t) => {
      if (s.statusFilter === "overdue") {
        if (!t.dueDate || t.status === "done") return false;
        return new Date(t.dueDate).getTime() < Date.now();
      }
      if (s.statusFilter !== "all" && t.status !== s.statusFilter) return false;
      return true;
    })
    .filter((t) => (s.tagFilter.length === 0 ? true : s.tagFilter.every((tag) => t.tags.includes(tag))))
    .filter((t) => {
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => a.position - b.position);
};

export const selectAllTagsForGroup = (s: Store): string[] => {
  if (!s.activeGroupId) return [];
  const set = new Set<string>();
  for (const t of s.tasks) {
    if (t.groupId === s.activeGroupId) t.tags.forEach((tag) => set.add(tag));
  }
  return Array.from(set).sort();
};
