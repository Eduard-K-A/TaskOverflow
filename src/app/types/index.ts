export type TaskStatus = "todo" | "done";

export type AccentColor =
  | "slate"
  | "rose"
  | "red"
  | "orange"
  | "amber"
  | "lime"
  | "emerald"
  | "teal"
  | "sky"
  | "blue"
  | "violet"
  | "fuchsia";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  groupId: string;
  title: string;
  notes: string;
  status: TaskStatus;
  dueDate: string | null;
  tags: string[];
  subtasks: Subtask[];
  position: number;
  createdAt: number;
  completedAt: number | null;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  accent: AccentColor;
  position: number;
  createdAt: number;
}

export interface PersistedState {
  groups: Group[];
  tasks: Task[];
  activeGroupId: string | null;
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  schemaVersion: number;
}
