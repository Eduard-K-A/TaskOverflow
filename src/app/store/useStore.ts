import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
}

interface DataState {
  groups: Group[];
  tasks: Task[];
}

interface Actions {
  // UI
  setTheme: (t: UIState["theme"]) => void;
  toggleSidebar: () => void;
  setActiveGroup: (id: string | null) => void;
  selectTask: (id: string | null) => void;
  setSearch: (q: string) => void;
  setStatusFilter: (s: StatusFilter) => void;
  toggleTagFilter: (tag: string) => void;
  clearFilters: () => void;
  setHelpOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  saveSettings: (next: Settings) => void;
  resetSettings: () => void;
  openGroupDialog: (editingId?: string | null) => void;
  closeGroupDialog: () => void;

  // Groups
  createGroup: (input: { name: string; emoji: string; accent: AccentColor }) => Group;
  updateGroup: (id: string, patch: Partial<Pick<Group, "name" | "emoji" | "accent">>) => void;
  deleteGroup: (id: string) => void;
  reorderGroups: (orderedIds: string[]) => void;

  // Tasks
  createTask: (input: { groupId: string; title: string }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTaskDone: (id: string) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (groupId: string, orderedIds: string[]) => void;

  // Subtasks
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  updateSubtask: (taskId: string, subtaskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;

  // Tags
  addTagToTask: (taskId: string, tag: string) => void;
  removeTagFromTask: (taskId: string, tag: string) => void;

  // Export
  exportGroup: (groupId: string, format: "json" | "csv") => void;
}

type Store = UIState & DataState & Actions;

const SCHEMA_VERSION = 1;

const seed = (): Pick<DataState, "groups" | "tasks"> & { activeGroupId: string | null } => {
  const g1: Group = {
    id: uid(),
    name: "Vault-Ledger",
    emoji: "🔐",
    accent: "violet",
    position: 0,
    createdAt: Date.now(),
  };
  const g2: Group = {
    id: uid(),
    name: "Vacation To-Do",
    emoji: "🏝️",
    accent: "teal",
    position: 1,
    createdAt: Date.now(),
  };
  const g3: Group = {
    id: uid(),
    name: "Work",
    emoji: "💼",
    accent: "blue",
    position: 2,
    createdAt: Date.now(),
  };

  const now = Date.now();
  const day = 86400000;
  const tasks: Task[] = [
    {
      id: uid(),
      groupId: g3.id,
      title: "Draft Q3 roadmap proposal",
      notes: "Outline three strategic bets and resourcing plan.",
      status: "todo",
      dueDate: new Date(now + day * 2).toISOString(),
      tags: ["planning", "leadership"],
      subtasks: [
        { id: uid(), title: "Interview engineering leads", done: true },
        { id: uid(), title: "Synthesize themes", done: false },
        { id: uid(), title: "Share draft with CEO", done: false },
      ],
      position: 0,
      createdAt: now,
      completedAt: null,
    },
    {
      id: uid(),
      groupId: g3.id,
      title: "Review hiring loop feedback",
      notes: "",
      status: "todo",
      dueDate: new Date(now - day).toISOString(),
      tags: ["hiring"],
      subtasks: [],
      position: 1,
      createdAt: now,
      completedAt: null,
    },
    {
      id: uid(),
      groupId: g3.id,
      title: "Refactor auth middleware",
      notes: "Move JWT verification into the edge layer.",
      status: "done",
      dueDate: null,
      tags: ["engineering"],
      subtasks: [],
      position: 2,
      createdAt: now,
      completedAt: now - day,
    },
    {
      id: uid(),
      groupId: g2.id,
      title: "Book ferry to Aegina",
      notes: "",
      status: "todo",
      dueDate: new Date(now + day * 7).toISOString(),
      tags: ["travel"],
      subtasks: [],
      position: 0,
      createdAt: now,
      completedAt: null,
    },
    {
      id: uid(),
      groupId: g1.id,
      title: "Rotate production database credentials",
      notes: "",
      status: "todo",
      dueDate: new Date(now + day * 14).toISOString(),
      tags: ["security"],
      subtasks: [],
      position: 0,
      createdAt: now,
      completedAt: null,
    },
  ];

  return { groups: [g1, g2, g3], tasks, activeGroupId: g3.id };
};

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const initial = seed();
      return {
        theme: "system",
        sidebarCollapsed: false,
        activeGroupId: initial.activeGroupId,
        selectedTaskId: null,
        searchQuery: "",
        statusFilter: "all",
        tagFilter: [],
        helpOpen: false,
        settingsOpen: false,
        groupDialog: { open: false, editingId: null },
        settings: DEFAULT_SETTINGS,
        groups: initial.groups,
        tasks: initial.tasks,

        setTheme: (theme) => set({ theme }),
        toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
        setActiveGroup: (id) => set({ activeGroupId: id, selectedTaskId: null }),
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
        saveSettings: (settings) => set({ settings }),
        resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
        openGroupDialog: (editingId = null) => set({ groupDialog: { open: true, editingId } }),
        closeGroupDialog: () => set({ groupDialog: { open: false, editingId: null } }),

        createGroup: ({ name, emoji, accent }) => {
          const group: Group = {
            id: uid(),
            name,
            emoji,
            accent,
            position: get().groups.length,
            createdAt: Date.now(),
          };
          set((s) => ({ groups: [...s.groups, group], activeGroupId: group.id }));
          return group;
        },
        updateGroup: (id, patch) =>
          set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
        deleteGroup: (id) =>
          set((s) => {
            const groups = s.groups.filter((g) => g.id !== id);
            const tasks = s.tasks.filter((t) => t.groupId !== id);
            const activeGroupId =
              s.activeGroupId === id ? groups[0]?.id ?? null : s.activeGroupId;
            return { groups, tasks, activeGroupId };
          }),
        reorderGroups: (orderedIds) =>
          set((s) => ({
            groups: orderedIds
              .map((id, i) => {
                const g = s.groups.find((x) => x.id === id);
                return g ? { ...g, position: i } : null;
              })
              .filter((g): g is Group => g !== null),
          })),

        createTask: ({ groupId, title }) => {
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
          return task;
        },
        updateTask: (id, patch) =>
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
        toggleTaskDone: (id) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id
                ? t.status === "done"
                  ? { ...t, status: "todo", completedAt: null }
                  : { ...t, status: "done", completedAt: Date.now() }
                : t,
            ),
          })),
        deleteTask: (id) =>
          set((s) => ({
            tasks: s.tasks.filter((t) => t.id !== id),
            selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
          })),
        reorderTasks: (groupId, orderedIds) =>
          set((s) => ({
            tasks: s.tasks.map((t) => {
              if (t.groupId !== groupId) return t;
              const idx = orderedIds.indexOf(t.id);
              return idx === -1 ? t : { ...t, position: idx };
            }),
          })),

        addSubtask: (taskId, title) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? { ...t, subtasks: [...t.subtasks, { id: uid(), title, done: false }] }
                : t,
            ),
          })),
        toggleSubtask: (taskId, subtaskId) =>
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
          })),
        updateSubtask: (taskId, subtaskId, title) =>
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
          })),
        deleteSubtask: (taskId, subtaskId) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== subtaskId) }
                : t,
            ),
          })),

        addTagToTask: (taskId, tag) => {
          const clean = tag.trim().toLowerCase();
          if (!clean) return;
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId && !t.tags.includes(clean)
                ? { ...t, tags: [...t.tags, clean] }
                : t,
            ),
          }));
        },
        removeTagFromTask: (taskId, tag) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId ? { ...t, tags: t.tags.filter((x) => x !== tag) } : t,
            ),
          })),

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
      };
    },
    {
      name: "taskoverflow-state",
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        sidebarCollapsed: s.sidebarCollapsed,
        activeGroupId: s.activeGroupId,
        groups: s.groups,
        tasks: s.tasks,
        settings: s.settings,
      }),
    },
  ),
);

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
        t.notes.toLowerCase().includes(q) ||
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
