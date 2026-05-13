import { useMemo, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { Sidebar } from "./components/Sidebar";
import {
  SearchBar,
  type SearchBarHandle,
} from "./components/SearchBar";
import { GroupHeader } from "./components/GroupHeader";
import { FilterBar } from "./components/FilterBar";
import { TaskList } from "./components/TaskList";
import {
  AddTaskInline,
  type AddTaskInlineHandle,
} from "./components/AddTaskInline";
import { TaskDetailPanel } from "./components/TaskDetailPanel";
import { EmptyState } from "./components/EmptyState";
import { GroupDialog } from "./components/GroupDialog";
import { HelpModal } from "./components/HelpModal";
import { SettingsDialog } from "./components/SettingsDialog";
import { useStore } from "./store/useStore";
import type { Task } from "./types";
import { useTheme } from "./hooks/useTheme";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useDueDateReminders } from "./hooks/useDueDateReminders";
import taskOverflowDarkIcon from "../taskoverflow-dark-icon.svg";
import taskOverflowLightIcon from "../taskoverflow-light-icon.svg";

export default function App() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = resolvedTheme === "dark" ? taskOverflowDarkIcon : taskOverflowLightIcon;
    }
  }, [resolvedTheme]);

  const hydrate = useStore((s) => s.hydrate);
  const isHydrated = useStore((s) => s.isHydrated);
  const activeGroupId = useStore((s) => s.activeGroupId);
  const groups = useStore((s) => s.groups);
  const tasks = useStore((s) => s.tasks);
  const searchQuery = useStore((s) => s.searchQuery);
  const statusFilter = useStore((s) => s.statusFilter);
  const tagFilter = useStore((s) => s.tagFilter);
  const clearFilters = useStore((s) => s.clearFilters);
  const openGroupDialog = useStore((s) => s.openGroupDialog);
  const showCompleted = useStore(
    (s) => s.settings.showCompleted,
  );
  const moveCompletedDown = useStore(
    (s) => s.settings.moveCompletedDown,
  );

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? null,
    [groups, activeGroupId],
  );

  const groupTasks = useMemo(
    () =>
      activeGroup
        ? tasks.filter((t) => t.groupId === activeGroup.id)
        : [],
    [tasks, activeGroup],
  );

  const visibleTasks = useMemo<Task[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = groupTasks
      .filter((t) => {
        if (statusFilter === "overdue") {
          if (!t.dueDate || t.status === "done") return false;
          return new Date(t.dueDate).getTime() < Date.now();
        }
        if (statusFilter !== "all" && t.status !== statusFilter)
          return false;
        if (
          !showCompleted &&
          statusFilter === "all" &&
          t.status === "done"
        )
          return false;
        return true;
      })
      .filter((t) =>
        tagFilter.length === 0
          ? true
          : tagFilter.every((tag) => t.tags.includes(tag)),
      )
      .filter((t) => {
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          (t.notes ?? "").toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      });

    return filtered.sort((a, b) => {
      if (moveCompletedDown) {
        const aDone = a.status === "done" ? 1 : 0;
        const bDone = b.status === "done" ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
      }
      return a.position - b.position;
    });
  }, [
    groupTasks,
    searchQuery,
    statusFilter,
    tagFilter,
    showCompleted,
    moveCompletedDown,
  ]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of groupTasks)
      t.tags.forEach((tag) => set.add(tag));
    return Array.from(set).sort();
  }, [groupTasks]);

  const totalInGroup = groupTasks.length;
  const doneInGroup = groupTasks.filter(
    (t) => t.status === "done",
  ).length;
  const hasFilters =
    statusFilter !== "all" ||
    tagFilter.length > 0 ||
    searchQuery.trim().length > 0;

  const addTaskRef = useRef<AddTaskInlineHandle>(null);
  const searchRef = useRef<SearchBarHandle>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!window.api?.subscribeReloadState) return;
    return window.api.subscribeReloadState(() => {
      void hydrate();
    });
  }, [hydrate]);

  useDueDateReminders();

  useKeyboardShortcuts(
    () => addTaskRef.current?.focus(),
    () => searchRef.current?.focus(),
  );

  const main = useMemo(() => {
    if (!activeGroup) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            illustration="groups"
            title="No groups yet"
            description="Groups keep separate projects in their own focused workspace."
            actionLabel="Create your first group"
            onAction={() => openGroupDialog()}
          />
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 pt-4 pb-4 space-y-5 shrink-0">
          <GroupHeader
            group={activeGroup}
            totalCount={totalInGroup}
            doneCount={doneInGroup}
          />
          <FilterBar availableTags={availableTags} />
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="max-w-3xl mx-auto space-y-2">
            <AddTaskInline
              ref={addTaskRef}
              groupId={activeGroup.id}
              accent={activeGroup.accent}
            />

            {visibleTasks.length > 0 ? (
              <TaskList
                key={activeGroup.id}
                tasks={visibleTasks}
                accent={activeGroup.accent}
                groupId={activeGroup.id}
              />
            ) : hasFilters ? (
              <EmptyState
                illustration="search"
                title="No matching tasks"
                description="Try clearing filters or adjusting your search."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            ) : totalInGroup === 0 ? (
              <EmptyState
                illustration="tasks"
                title={`Welcome to ${activeGroup.name}`}
                description="Capture your next task above, or press N to focus the quick-add input."
              />
            ) : (
              <EmptyState
                illustration="tasks"
                title="All caught up"
                description="Every task in this view is complete. Nice work."
              />
            )}
          </div>
        </div>
      </div>
    );
  }, [
    activeGroup,
    availableTags,
    clearFilters,
    doneInGroup,
    hasFilters,
    openGroupDialog,
    totalInGroup,
    visibleTasks,
  ]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground animate-in fade-in duration-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full w-full flex bg-background text-foreground overflow-hidden">
      <Sidebar />

      <div className="relative flex-1 flex flex-col overflow-hidden">
        <header className="h-14 shrink-0 flex items-center justify-between px-6 gap-4">
          <SearchBar ref={searchRef} />
          <Button
            onClick={() => addTaskRef.current?.focus()}
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" />
            Add Task
          </Button>
        </header>

        {main}

        {activeGroup && (
          <TaskDetailPanel accent={activeGroup.accent} />
        )}
      </div>

      <GroupDialog />
      <HelpModal />
      <SettingsDialog />
      <Toaster position="bottom-right" />
    </div>
  );
}
