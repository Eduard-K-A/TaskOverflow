"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  ChevronsUpDown,
  Plus,
  MoreHorizontal,
  Folder,
  Trash2,
  Settings,
  HelpCircle,
  LayoutDashboard,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarRail,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useStore } from "../store/useStore";
import { ACCENT_PALETTE } from "../lib/tokens";
import { cn } from "./ui/utils";
import { useTheme } from "../hooks/useTheme";
import taskOverflowDarkIcon from "../../taskoverflow-dark-icon.svg";
import taskOverflowLightIcon from "../../taskoverflow-light-icon.svg";
import type { Group } from "../types";

interface SortableGroupItemProps {
  group: Group;
  active: boolean;
  count: number;
  showCounts: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const SortableGroupItem = ({
  group,
  active,
  count,
  showCounts,
  onSelect,
  onEdit,
  onDelete,
}: SortableGroupItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const accent = ACCENT_PALETTE[group.accent];

  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <SidebarMenuButton
        {...attributes}
        {...listeners}
        tooltip={group.name}
        isActive={active}
        onClick={() => onSelect(group.id)}
        className="group relative group-data-[state=collapsed]:justify-center"
      >
        {active && (
          <motion.div
            layoutId="active-group-indicator"
            className="absolute inset-0 bg-sidebar-accent rounded-md z-0"
            initial={false}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 38,
            }}
          />
        )}
        <div className={cn("size-2 rounded-full shrink-0 relative z-10", accent.fill)} />
        <span className="relative z-10 group-data-[state=collapsed]:hidden">{group.name}</span>
        {showCounts && count > 0 && (
          <span className="ml-auto text-[10px] font-medium tabular-nums text-muted-foreground/70 relative z-10 group-data-[state=collapsed]:hidden">
            {count}
          </span>
        )}
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-48">
          <DropdownMenuItem onClick={() => onEdit(group.id)}>
            <Folder className="mr-2 size-4 text-muted-foreground" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(group.id)}
          >
            <Trash2 className="mr-2 size-4" />
            <span>Delete Group</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export const AppSidebar = () => {
  const { resolvedTheme } = useTheme();
  const groups = useStore((s) => s.groups);
  const tasks = useStore((s) => s.tasks);
  const activeGroupId = useStore((s) => s.activeGroupId);
  const setActiveGroup = useStore((s) => s.setActiveGroup);
  const openGroupDialog = useStore((s) => s.openGroupDialog);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const settings = useStore((s) => s.settings);
  const deleteGroup = useStore((s) => s.deleteGroup);
  const reorderGroups = useStore((s) => s.reorderGroups);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const countFor = (id: string) =>
    tasks.filter((t) => t.groupId === id && t.status !== "done").length;

  const sortedGroups = [...groups].sort((a, b) => a.position - b.position);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedGroups.findIndex((g) => g.id === active.id);
    const newIndex = sortedGroups.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(sortedGroups, oldIndex, newIndex);
    await reorderGroups(next.map((g) => g.id));
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent cursor-default group-data-[state=collapsed]:justify-center">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-border/60 overflow-hidden shrink-0">
                <img
                  src={resolvedTheme === "dark" ? taskOverflowDarkIcon : taskOverflowLightIcon}
                  alt=""
                  className="size-full object-cover"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[state=collapsed]:hidden">
                <span className="truncate font-semibold text-foreground">TaskOverflow</span>
                <span className="truncate text-xs text-muted-foreground">Minimal Tasks</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="All Groups" 
                onClick={() => setActiveGroup(null)} 
                isActive={!activeGroupId}
                className="group-data-[state=collapsed]:justify-center"
              >
                <LayoutDashboard className="size-4 shrink-0" />
                <span className="group-data-[state=collapsed]:hidden">Overview</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between pr-2 group-data-[state=collapsed]:hidden">
            <SidebarGroupLabel>Groups</SidebarGroupLabel>
            <button 
              onClick={() => openGroupDialog()}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Add Group"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            autoScroll={false}
          >
            <SortableContext items={sortedGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              <SidebarMenu>
                {sortedGroups.map((g) => (
                  <SortableGroupItem
                    key={g.id}
                    group={g}
                    active={g.id === activeGroupId}
                    count={countFor(g.id)}
                    showCounts={settings.showCounts}
                    onSelect={setActiveGroup}
                    onEdit={openGroupDialog}
                    onDelete={deleteGroup}
                  />
                ))}
              </SidebarMenu>
            </SortableContext>
          </DndContext>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Settings" 
              onClick={() => setSettingsOpen(true)}
              className="group-data-[state=collapsed]:justify-center"
            >
              <Settings className="size-4 shrink-0" />
              <span className="group-data-[state=collapsed]:hidden">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Help & Shortcuts" 
              onClick={() => setHelpOpen(true)}
              className="group-data-[state=collapsed]:justify-center"
            >
              <HelpCircle className="size-4 shrink-0" />
              <span className="group-data-[state=collapsed]:hidden">Help & Shortcuts</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
