import { useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { AppSidebar } from "./components/Sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "./components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb";
import { Separator } from "./components/ui/separator";
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
import { CommandPaletteDialog } from "./components/CommandPaletteDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
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
  const setActiveGroup = useStore((s) => s.setActiveGroup);
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
      if (groups.length === 0) {
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
          <div className="px-8 pt-6 pb-4 shrink-0">
            <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
            <p className="text-muted-foreground mt-1">
              Select a group to start managing your tasks.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => {
                const count = tasks.filter(
                  (t) => t.groupId === group.id && t.status !== "done",
                ).length;
                return (
                  <Card
                    key={group.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors group relative overflow-hidden"
                    onClick={() => setActiveGroup(group.id)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {group.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{count}</div>
                      <p className="text-xs text-muted-foreground">
                        pending tasks
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
              <Card
                className="cursor-pointer border-dashed hover:bg-accent/50 transition-colors flex flex-col items-center justify-center p-6 text-center"
                onClick={() => openGroupDialog()}
              >
                <Plus className="size-8 text-muted-foreground mb-2" />
                <CardTitle className="text-sm font-medium">Add Group</CardTitle>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Section - No Animation */}
        <div className="px-8 pt-4 pb-4 space-y-5 shrink-0">
          <GroupHeader
            group={activeGroup}
            totalCount={totalInGroup}
            doneCount={doneInGroup}
          />
          <FilterBar availableTags={availableTags} />
        </div>

        {/* Task Section - Animated */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-8 pb-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={activeGroup.id}
              layoutId="task-content-container"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 35,
              }}
              className="space-y-6"
            >
              <AddTaskInline
                ref={addTaskRef}
                groupId={activeGroup.id}
                accent={activeGroup.accent}
              />

              {visibleTasks.length > 0 ? (
                <TaskList
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
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }, [
    activeGroup,
    groups,
    tasks,
    availableTags,
    clearFilters,
    doneInGroup,
    hasFilters,
    openGroupDialog,
    setActiveGroup,
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
    <SidebarProvider>
      <div className="h-full w-full flex bg-background text-foreground overflow-hidden">
        <AppSidebar />

        <SidebarInset>
          <div className="relative flex-1 flex flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b">
              <div className="flex flex-1 items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb className="flex-1">
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); useStore.getState().setActiveGroup(null); }}>
                        Workspace
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="relative">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={activeGroup?.id ?? "overview"}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="block"
                          >
                            {activeGroup?.name ?? "Overview"}
                          </motion.span>
                        </AnimatePresence>
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                
                <div className="flex items-center gap-4">
                  <SearchBar ref={searchRef} />
                </div>
              </div>
            </header>

            {main}

            {activeGroup && (
              <TaskDetailPanel accent={activeGroup.accent} />
            )}
          </div>
        </SidebarInset>

        <GroupDialog />
        <HelpModal />
        <SettingsDialog />
        <CommandPaletteDialog />
        <Toaster position="bottom-right" />
      </div>
    </SidebarProvider>
  );
}
