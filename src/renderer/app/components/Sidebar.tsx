import { motion, AnimatePresence } from "motion/react";
import { Plus, PanelLeftClose, PanelLeft, Settings, HelpCircle, CheckSquare } from "lucide-react";
import { useStore } from "../store/useStore";
import { ACCENT_PALETTE } from "../lib/tokens";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "./ui/utils";

export const Sidebar = () => {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggle = useStore((s) => s.toggleSidebar);
  const groups = useStore((s) => s.groups);
  const tasks = useStore((s) => s.tasks);
  const activeGroupId = useStore((s) => s.activeGroupId);
  const setActiveGroup = useStore((s) => s.setActiveGroup);
  const openGroupDialog = useStore((s) => s.openGroupDialog);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const settings = useStore((s) => s.settings);

  const countFor = (id: string) =>
    tasks.filter((t) => t.groupId === id && t.status !== "done").length;

  return (
    <TooltipProvider delayDuration={200}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : settings.sidebarWidth }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative shrink-0 h-full border-r border-border bg-sidebar text-sidebar-foreground flex flex-col"
        style={{ borderTopRightRadius: 16, borderBottomRightRadius: 16 }}
      >
        <div
          className={cn(
            "flex items-center h-14 shrink-0 gap-2",
            collapsed ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <CheckSquare className="size-4" />
              </div>
              <span className="truncate">TaskOverflow</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="size-8 shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>

        <div className="px-3 pb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() => openGroupDialog()}
                className={cn(
                  "w-full justify-start gap-2 h-9",
                  collapsed && "justify-center px-0",
                )}
              >
                <Plus className="size-4 shrink-0" />
                {!collapsed && <span>New Group</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">New Group · G</TooltipContent>}
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1">
          <nav className="flex flex-col gap-1">
            {[...groups]
              .sort((a, b) => a.position - b.position)
              .map((g) => {
                const accent = ACCENT_PALETTE[g.accent];
                const active = g.id === activeGroupId;
                const count = countFor(g.id);
                return (
                  <Tooltip key={g.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setActiveGroup(g.id)}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-2 h-9 transition-colors text-left",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/60",
                          collapsed && "justify-center",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full transition-opacity",
                            accent.fill,
                            active ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full transition-transform",
                            accent.fill,
                            active ? "scale-110" : "opacity-80",
                          )}
                          aria-hidden
                        />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{g.name}</span>
                            {settings.showCounts && count > 0 && (
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {count}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        {g.name}
                        {count > 0 && ` · ${count}`}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
          </nav>
        </div>

        <div className="border-t border-border px-3 py-3 flex items-center gap-2">
          <ThemeToggle compact={collapsed} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setHelpOpen(true)}
                aria-label="Keyboard shortcuts"
              >
                <HelpCircle className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Shortcuts · ?</TooltipContent>
          </Tooltip>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 ml-auto"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="size-4" />
            </Button>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  );
};
