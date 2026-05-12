# TaskOverflow — Electron + React Project Plan Prompt

> Paste this into Claude, ChatGPT, or Gemini to generate a full production-ready project plan.
> Best used inside a Claude Project so the plan stays in context across all coding sessions.

---

## The Prompt

---

You are a senior software architect and UI/UX engineer specializing in Electron desktop applications with a React frontend. I need you to produce a comprehensive, production-ready project plan for a desktop task management application.

### Project overview

The application is a personal to-do manager called **"TaskOverflow"**. It should feel premium yet minimalist — think Linear, Notion, or Things 3 in terms of design language. The core differentiator is the ability to create named custom **groups** (e.g. "Vault-Ledger", "Vacation To-Do", "Work") that act as isolated project workspaces. Each group has its own task list with rich metadata.

**Tech stack (non-negotiable):**
- **Electron 33+** — desktop shell, system tray, native OS integration
- **React 18** — UI framework using functional components and hooks only
- **TypeScript** — strict mode enabled throughout, no `any` types
- **Vite** — build tool and dev server (with `electron-vite` for unified config)
- **Tailwind CSS v4** — utility-first styling
- **shadcn/ui** — base component library (built on Radix UI primitives)
- **Zustand** — lightweight global state management
- **better-sqlite3** — synchronous SQLite bindings for the Electron main process
- **Framer Motion** — animations and micro-interactions

---

### Core feature requirements

#### 1. Groups / Workspaces
- Create, rename, reorder, and delete named groups
- Each group has a user-selected accent color (from a curated 12-color palette) and optional emoji icon
- Sidebar navigation between groups — collapsible with smooth width transition
- Group-level accent color reflected in the header, checkbox fill, and active states

#### 2. Task management
- Add, edit, delete tasks within a group
- Task fields: `title`, `notes` (rich text via Tiptap), `due_date`, `status` (To-Do / In Progress / Done), `tags` (multi-select), `subtasks` (nested checklist)
- No priority field — removed intentionally for minimalism
- Drag-and-drop reordering via `@dnd-kit/core`
- Inline task completion with animated checkbox (circle → checkmark with Framer Motion)
- Filter tasks by status, due date, and tags
- Overdue tasks auto-highlighted in red

#### 3. Design system
- Dark mode and light mode — follows OS preference by default, manually overridable
- CSS variables for all design tokens (colors, spacing, radius, font sizes)
- Single typeface: **Geist** (Vercel's open-source font) — clean, modern, purpose-built for product UIs
- 8px spacing grid throughout
- Micro-animations: task completion, sidebar collapse, modal entrance/exit, hover lift on task rows
- No heavy borders — whitespace and subtle `1px` separators do the work
- Empty states: illustrated SVG placeholder per group type + clear CTA

#### 4. Data layer (Electron main process)
- SQLite database via `better-sqlite3` — synchronous, no async complexity
- All DB operations in the **main process** only; renderer communicates via IPC (`ipcRenderer` / `ipcMain`)
- Automatic schema migrations using a lightweight version table
- Export tasks per group to CSV or JSON (triggered from renderer, file written by main)
- Full-text search using SQLite FTS5 extension across task titles and notes

#### 5. System integration
- System tray icon with context menu: Open, Quick Add Task, Quit
- Quick Add Task: a frameless mini-window (300×160px) for fast task entry
- Native OS notifications for due task reminders using Electron's `Notification` API
- Auto-start on login via `app.setLoginItemSettings()`
- Single instance lock — prevent duplicate app windows

---

### Design philosophy constraints

- **Premium minimalism**: every UI element must earn its place — no decorative chrome
- Consistent **8px spacing grid** — all padding and margins are multiples of 8px
- **Rounded corners**: `8px` for inputs and buttons, `12px` for cards and modals, `16px` for the sidebar panel
- Motion is purposeful — max **200ms** ease-out for transitions, **150ms** for hover states
- Primary action (Add Task) always accessible in one click or via `N` keyboard shortcut
- Beautiful empty states — not blank white screens
- Full keyboard shortcut coverage — documented in a `?` help modal

---

### What I need you to generate

Please produce **ALL** of the following sections. Use code blocks for every code sample. Be specific and production-ready — no placeholder pseudocode.

---

#### 1. Project structure
Full directory tree with a one-line description of every file and folder. Include:
- `electron/` — main process, preload scripts, IPC handlers
- `src/` — React app (renderer process)
- `src/components/` — broken into `ui/`, `layout/`, `tasks/`, `groups/`
- `src/store/` — Zustand stores
- `src/hooks/` — custom React hooks
- `src/lib/` — utilities (date formatting, IPC bridge, export helpers)
- `src/types/` — shared TypeScript interfaces
- Config files: `electron-vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `package.json`

#### 2. Database schema
Full SQLite schema using `better-sqlite3` syntax. Include:

```sql
-- All CREATE TABLE statements for:
-- groups, tasks, subtasks, tags, task_tags (junction), settings, schema_version
-- All indexes
-- All CHECK constraints
-- Cascade delete rules
```

Also include the migration runner function in TypeScript that checks `schema_version` and applies pending migrations.

#### 3. IPC architecture
Since Electron separates the main process (Node.js / DB access) from the renderer (React), describe:
- The full list of IPC channels (e.g. `groups:create`, `tasks:list`, `tasks:update`)
- The `preload.ts` contextBridge API shape — what is exposed to the renderer as `window.api`
- How the renderer calls `window.api.tasks.create(payload)` and receives the result
- TypeScript types for every IPC payload and response
- Error handling pattern across the IPC boundary

#### 4. State management design
Using Zustand — describe:
- The shape of `useGroupStore`, `useTaskStore`, and `useUIStore`
- How stores call `window.api` (IPC) and update local state after DB confirmation
- The optimistic update pattern for task completion (check immediately, rollback on error)
- How the active group selection flows from sidebar click → store → task list re-render

#### 5. UI component inventory
List every screen and component with:
- Component name and file path
- Tailwind + shadcn/ui base or custom
- Key props (TypeScript interface)
- Behavior notes

Required components include: `Sidebar`, `GroupItem`, `TaskList`, `TaskRow`, `TaskDetailPanel` (slide-in drawer), `AddTaskInline`, `GroupDialog` (create/edit modal), `QuickAddWindow`, `EmptyState`, `SearchBar`, `TagBadge`, `DueDateLabel`, `ThemeToggle`, `HelpModal`, `SettingsPage`, `ExportDialog`.

#### 6. Development roadmap
Break the build into 5 phases with estimated effort, specific deliverables, and the exact files created in each phase:

- **Phase 1** — Scaffold + Electron shell + DB + IPC + basic CRUD (no UI polish)
- **Phase 2** — Full React UI: sidebar, task list, task detail drawer, dark/light mode
- **Phase 3** — Drag-and-drop reordering, filters, full-text search, tags
- **Phase 4** — System tray, quick-add window, notifications, CSV/JSON export
- **Phase 5** — Animations (Framer Motion), keyboard shortcuts, empty states, help modal, performance audit

#### 7. package.json dependencies
Provide the complete `package.json` `dependencies` and `devDependencies` with:
- Every package name and version
- A comment on each explaining why it is needed
- Scripts: `dev`, `build`, `build:win`, `build:mac`, `lint`, `typecheck`

#### 8. Design token file
A `src/lib/tokens.ts` file exporting all design tokens as a typed const:
- Color palette (12 group accent colors + semantic colors for light/dark)
- Font sizes (xs through 2xl)
- Spacing scale (4px base, 8px grid)
- Border radii
- Animation durations and easings
- Z-index layers

Also provide the matching `tailwind.config.ts` that consumes these tokens via CSS variables.

#### 9. Risk & decision log
Identify **6 key architectural decisions** with:
- The decision to make
- Options considered
- Recommended choice
- Rationale in 2–3 sentences

Cover: IPC sync vs async, better-sqlite3 vs Drizzle ORM, Zustand vs Redux Toolkit, Tailwind v4 vs v3, `electron-builder` vs `electron-forge`, and handling SQLite access from renderer vs main.

---

### Constraints and assumptions
- Target platforms: Windows 11 and macOS 14+
- No cloud sync — fully local, privacy-first
- No user accounts or authentication
- Assume I am an intermediate TypeScript/React developer comfortable with hooks and component composition, but new to Electron's main/renderer process split
- Format all code in TypeScript with strict types — no `any`, no `// @ts-ignore`

---

*Stack: Electron 33 · React 18 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui · Zustand · better-sqlite3 · Framer Motion*