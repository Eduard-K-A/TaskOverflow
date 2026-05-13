"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Monitor,
  PanelLeft,
  Plus,
  CheckCircle2,
  Circle,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command";
import { useStore } from "../store/useStore";
import { useTheme } from "../hooks/useTheme";

export function CommandPaletteDialog() {
  const open = useStore((s) => s.commandPaletteOpen);
  const setOpen = useStore((s) => s.setCommandPaletteOpen);
  const groups = useStore((s) => s.groups);
  const tasks = useStore((s) => s.tasks);
  const setActiveGroup = useStore((s) => s.setActiveGroup);
  const selectTask = useStore((s) => s.selectTask);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const openGroupDialog = useStore((s) => s.openGroupDialog);
  const { setTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() =>
              runCommand(() => setActiveGroup(null))
            }
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Overview</span>
          </CommandItem>
          {groups.map((group) => (
            <CommandItem
              key={group.id}
              onSelect={() =>
                runCommand(() => setActiveGroup(group.id))
              }
            >
      
              <span>{group.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Tasks">
          {tasks.filter(t => t.status !== 'done').slice(0, 5).map((task) => (
            <CommandItem
              key={task.id}
              onSelect={() =>
                runCommand(() => {
                  setActiveGroup(task.groupId);
                  selectTask(task.id);
                })
              }
            >
              <Circle className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="truncate">{task.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings & Actions">
          <CommandItem onSelect={() => runCommand(() => openGroupDialog())}>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Group</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => toggleSidebar())}>
            <PanelLeft className="mr-2 h-4 w-4" />
            <span>Toggle Sidebar</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setSettingsOpen(true))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setHelpOpen(true))}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Shortcuts</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Appearance">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <Monitor className="mr-2 h-4 w-4" />
            <span>System Theme</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
