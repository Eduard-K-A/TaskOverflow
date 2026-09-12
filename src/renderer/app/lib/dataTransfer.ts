import type { AccentColor, Group, Task, TaskStatus } from "../types";
import { ACCENT_KEYS } from "./tokens";

export interface ImportTaskDraft {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  dueDate: string | null;
  tags: string[];
  subtasks: Array<{ title: string }>;
}

export interface ImportGroupDraft {
  id: string;
  name: string;
  emoji: string;
  accent: AccentColor;
  tasks: ImportTaskDraft[];
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `import_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export function isAccentColor(v: unknown): v is AccentColor {
  return typeof v === "string" && ACCENT_KEYS.includes(v as AccentColor);
}

function normalizeStatus(v: unknown): TaskStatus {
  return v === "done" ? "done" : "todo";
}

function normalizeTask(raw: Record<string, unknown>, id?: string): ImportTaskDraft | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) return null;
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase()).filter(Boolean)
    : typeof raw.tags === "string"
      ? raw.tags.split("|").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];
  const subtasks = Array.isArray(raw.subtasks)
    ? raw.subtasks
        .map((st) => {
          if (typeof st === "string") return st.trim() ? { title: st.trim() } : null;
          if (st && typeof st === "object" && typeof (st as { title?: unknown }).title === "string") {
            const t = (st as { title: string }).title.trim();
            return t ? { title: t } : null;
          }
          return null;
        })
        .filter((s): s is { title: string } => s !== null)
    : [];

  return {
    id: id ?? uid(),
    title,
    notes: typeof raw.notes === "string" ? raw.notes : "",
    status: normalizeStatus(raw.status),
    dueDate: typeof raw.dueDate === "string" ? raw.dueDate : typeof raw.due_date === "string" ? raw.due_date : null,
    tags,
    subtasks,
  };
}

function normalizeGroup(raw: Record<string, unknown>, tasks: ImportTaskDraft[]): ImportGroupDraft | null {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return null;
  return {
    id: uid(),
    name,
    emoji: typeof raw.emoji === "string" ? raw.emoji : "",
    accent: isAccentColor(raw.accent) ? raw.accent : "blue",
    tasks,
  };
}

function entriesFromJson(data: unknown): ImportGroupDraft[] {
  const entries: ImportGroupDraft[] = [];

  const pushEntry = (groupRaw: unknown, tasksRaw: unknown) => {
    if (!groupRaw || typeof groupRaw !== "object") return;
    const tasks = Array.isArray(tasksRaw)
      ? tasksRaw
          .map((t) => (t && typeof t === "object" ? normalizeTask(t as Record<string, unknown>) : null))
          .filter((t): t is ImportTaskDraft => t !== null)
      : [];
    const group = normalizeGroup(groupRaw as Record<string, unknown>, tasks);
    if (group) entries.push(group);
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") {
        pushEntry((item as { group?: unknown }).group, (item as { tasks?: unknown }).tasks);
      }
    }
    return entries;
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.entries)) {
      for (const item of obj.entries) {
        if (item && typeof item === "object") {
          pushEntry((item as { group?: unknown }).group, (item as { tasks?: unknown }).tasks);
        }
      }
      return entries;
    }

    if (Array.isArray(obj.groups) && Array.isArray(obj.tasks)) {
      const tasks = obj.tasks as Array<Record<string, unknown>>;
      for (const g of obj.groups as Array<Record<string, unknown>>) {
        const gid = typeof g.id === "string" ? g.id : "";
        const groupTasks = tasks
          .filter((t) => t.groupId === gid || t.group_id === gid)
          .map((t) => normalizeTask(t))
          .filter((t): t is ImportTaskDraft => t !== null);
        const group = normalizeGroup(g, groupTasks);
        if (group) entries.push(group);
      }
      return entries;
    }

    pushEntry(obj.group, obj.tasks);
  }

  return entries;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function entriesFromCsv(text: string): ImportGroupDraft[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const groupNameIdx = idx("group_name");
  const groupAccentIdx = idx("group_accent");
  const titleIdx = idx("title");
  if (titleIdx === -1) return [];

  const statusIdx = idx("status");
  const dueIdx = idx("due_date") !== -1 ? idx("due_date") : idx("due date");
  const tagsIdx = idx("tags");
  const notesIdx = idx("notes");

  const byGroup = new Map<string, ImportGroupDraft>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const title = cols[titleIdx]?.trim();
    if (!title) continue;

    const groupName = (groupNameIdx !== -1 ? cols[groupNameIdx]?.trim() : "") || "Imported";
    const accentRaw = groupAccentIdx !== -1 ? cols[groupAccentIdx]?.trim() : "blue";

    let group = byGroup.get(groupName);
    if (!group) {
      group = {
        id: uid(),
        name: groupName,
        emoji: "",
        accent: isAccentColor(accentRaw) ? accentRaw : "blue",
        tasks: [],
      };
      byGroup.set(groupName, group);
    }

    const task = normalizeTask({
      title,
      status: statusIdx !== -1 ? cols[statusIdx] : "todo",
      due_date: dueIdx !== -1 ? cols[dueIdx] : null,
      tags: tagsIdx !== -1 ? cols[tagsIdx] : "",
      notes: notesIdx !== -1 ? cols[notesIdx] : "",
    });
    if (task) group.tasks.push(task);
  }

  return Array.from(byGroup.values());
}

export function parseImportFile(text: string, filename: string): ImportGroupDraft[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) {
    return entriesFromCsv(text);
  }
  const data = JSON.parse(text) as unknown;
  return entriesFromJson(data);
}

export function buildExportJson(groups: Group[], tasks: Task[]): string {
  const entries = groups
    .sort((a, b) => a.position - b.position)
    .map((group) => ({
      group: {
        name: group.name,
        emoji: group.emoji,
        accent: group.accent,
      },
      tasks: tasks
        .filter((t) => t.groupId === group.id)
        .sort((a, b) => a.position - b.position)
        .map((t) => ({
          title: t.title,
          notes: t.notes,
          status: t.status,
          dueDate: t.dueDate,
          tags: t.tags,
          subtasks: t.subtasks.map((s) => ({ title: s.title, done: s.done })),
        })),
    }));

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries,
    },
    null,
    2,
  );
}

export function buildExportCsv(groups: Group[], tasks: Task[]): string {
  const headers = ["group_name", "group_accent", "title", "status", "due_date", "tags", "notes"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows: string[] = [headers.join(",")];

  for (const group of groups.sort((a, b) => a.position - b.position)) {
    const groupTasks = tasks
      .filter((t) => t.groupId === group.id)
      .sort((a, b) => a.position - b.position);
    for (const t of groupTasks) {
      rows.push(
        [
          group.name,
          group.accent,
          t.title,
          t.status,
          t.dueDate ?? "",
          t.tags.join("|"),
          t.notes,
        ]
          .map((v) => escape(String(v)))
          .join(","),
      );
    }
  }

  return rows.join("\n");
}

export function downloadDataFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
