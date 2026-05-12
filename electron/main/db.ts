import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

let db: Database.Database;

export function initDb() {
  const userDataPath = app.getPath('userData');
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true });
  }

  const dbPath = join(userDataPath, 'taskoverflow.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate();
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT,
      accent TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT CHECK(status IN ('todo', 'done')) NOT NULL,
      due_date TEXT,
      position INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      is_done BOOLEAN NOT NULL CHECK (is_done IN (0, 1)),
      position INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const result = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined;
  if (!result) {
    db.prepare('INSERT INTO schema_version (version) VALUES (1)').run();
  }
}

// Group Repository
export const groupsRepo = {
  getAll: () => db.prepare('SELECT * FROM groups ORDER BY position').all(),
  create: (group: any) => {
    return db.prepare(`
      INSERT INTO groups (id, name, emoji, accent, position, created_at)
      VALUES (@id, @name, @emoji, @accent, @position, @created_at)
    `).run(group);
  },
  update: (id: string, patch: any) => {
    const keys = Object.keys(patch);
    const setClause = keys.map(k => `${k} = @${k}`).join(', ');
    return db.prepare(`UPDATE groups SET ${setClause} WHERE id = @id`).run({ ...patch, id });
  },
  delete: (id: string) => db.prepare('DELETE FROM groups WHERE id = ?').run(id),
  reorder: (orderedIds: string[]) => {
    const transaction = db.transaction((ids) => {
      const stmt = db.prepare('UPDATE groups SET position = ? WHERE id = ?');
      ids.forEach((id: string, index: number) => stmt.run(index, id));
    });
    transaction(orderedIds);
  }
};

// Task Repository
export const tasksRepo = {
  getAll: () => {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY position').all() as any[];
    return tasks.map(t => {
      const subtasks = db.prepare('SELECT id, title, is_done as done FROM subtasks WHERE task_id = ? ORDER BY position').all(t.id);
      const tags = db.prepare(`
        SELECT t.name FROM tags t
        JOIN task_tags tt ON t.id = tt.tag_id
        WHERE tt.task_id = ?
      `).all(t.id).map((row: any) => row.name);
      return { ...t, subtasks, tags, dueDate: t.due_date, createdAt: t.created_at, completedAt: t.completed_at };
    });
  },
  create: (task: any) => {
    return db.prepare(`
      INSERT INTO tasks (id, group_id, title, notes, status, due_date, position, created_at, completed_at)
      VALUES (@id, @groupId, @title, @notes, @status, @dueDate, @position, @createdAt, @completedAt)
    `).run(task);
  },
  update: (id: string, patch: any) => {
    const keys = Object.keys(patch).filter(k => !['subtasks', 'tags'].includes(k));
    if (keys.length > 0) {
      const setClause = keys.map(k => {
        const dbKey = k === 'dueDate' ? 'due_date' : k === 'createdAt' ? 'created_at' : k === 'completedAt' ? 'completed_at' : k;
        return `${dbKey} = @${k}`;
      }).join(', ');
      db.prepare(`UPDATE tasks SET ${setClause} WHERE id = @id`).run({ ...patch, id });
    }
  },
  delete: (id: string) => db.prepare('DELETE FROM tasks WHERE id = ?').run(id),
  reorder: (groupId: string, orderedIds: string[]) => {
    const transaction = db.transaction((ids) => {
      const stmt = db.prepare('UPDATE tasks SET position = ? WHERE id = ? AND group_id = ?');
      ids.forEach((id: string, index: number) => stmt.run(index, id, groupId));
    });
    transaction(orderedIds);
  }
};

// Subtask Repository
export const subtasksRepo = {
  add: (taskId: string, subtask: any) => {
    return db.prepare(`
      INSERT INTO subtasks (id, task_id, title, is_done, position)
      VALUES (@id, @taskId, @title, @isDone, @position)
    `).run({ ...subtask, taskId, isDone: subtask.done ? 1 : 0 });
  },
  update: (id: string, patch: any) => {
    if (patch.done !== undefined) patch.is_done = patch.done ? 1 : 0;
    const keys = Object.keys(patch).filter(k => k !== 'done');
    const setClause = keys.map(k => `${k} = @${k}`).join(', ');
    return db.prepare(`UPDATE subtasks SET ${setClause} WHERE id = @id`).run({ ...patch, id });
  },
  delete: (id: string) => db.prepare('DELETE FROM subtasks WHERE id = ?').run(id),
  deleteByTask: (taskId: string) => db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(taskId)
};

// Tags Repository
export const tagsRepo = {
  addToTask: (taskId: string, tagName: string) => {
    db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tagName);
    const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: number };
    return db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tag.id);
  },
  removeFromTask: (taskId: string, tagName: string) => {
    const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: number };
    if (tag) {
      return db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(taskId, tag.id);
    }
  }
};

// Settings Repository
export const settingsRepo = {
  get: () => {
    const rows = db.prepare('SELECT * FROM settings').all() as any[];
    const settings: any = {};
    rows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });
    return settings;
  },
  set: (key: string, value: any) => {
    return db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  }
};
