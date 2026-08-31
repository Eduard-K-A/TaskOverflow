import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useStore } from "../store/useStore";
import { ACCENT_PALETTE } from "../lib/tokens";
import { dateKeyFromDate, dateKeyFromIso } from "../lib/date";
import { Button } from "./ui/button";
import { DataExportImportActions } from "./DataExportImportActions";
import { CalendarDayDialog } from "./CalendarDayDialog";
import { cn } from "./ui/utils";
import type { Group, Task } from "../types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Row geometry used to work out how many task pills fit inside a day cell. */
const MIN_ROW_HEIGHT = 96;
const CELL_PADDING = 12; // p-1.5, top + bottom
const DAY_NUMBER_ROW = 28; // size-6 badge + mb-1
const PILL_HEIGHT = 20; // pill height + gap-0.5
const MORE_ROW_HEIGHT = 14; // the "+N more" link
const MIN_VISIBLE_TASKS = 1;

function groupTasksByDate(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = dateKeyFromIso(task.dueDate);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(task);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => {
      const aDone = a.status === "done" ? 1 : 0;
      const bDone = b.status === "done" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.title.localeCompare(b.title);
    });
  }
  return map;
}

const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
};

interface DayTaskPillProps {
  task: Task;
  group: Group | undefined;
  selected: boolean;
  onSelect: (id: string) => void;
}

const DayTaskPill = ({ task, group, selected, onSelect }: DayTaskPillProps) => {
  const accent = ACCENT_PALETTE[group?.accent ?? "blue"] ?? ACCENT_PALETTE.blue;
  const done = task.status === "done";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(task.id);
      }}
      className={cn(
        "w-full shrink-0 text-left rounded px-1.5 py-0.5 text-[11px] leading-tight truncate transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        accent.soft,
        selected && "ring-1 ring-foreground/40",
        done ? "text-muted-foreground line-through opacity-70" : "text-foreground",
      )}
      title={group ? `${group.name}: ${task.title}` : task.title}
    >
      <span className={cn("inline-block size-1.5 rounded-full mr-1 align-middle", accent.fill)} />
      {task.title}
    </button>
  );
};

export const CalendarView = () => {
  const tasks = useStore((s) => s.tasks);
  const groups = useStore((s) => s.groups);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const selectCalendarTask = useStore((s) => s.selectCalendarTask);
  const openCalendarTaskDialog = useStore((s) => s.openCalendarTaskDialog);
  const taskDialogOpen = useStore((s) => s.calendarTaskDialog.open);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(MIN_ROW_HEIGHT);

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);

  const dayModalTasks = useMemo(() => {
    if (!dayModalDate) return [];
    return tasksByDate.get(dayModalDate) ?? [];
  }, [dayModalDate, tasksByDate]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const weekCount = Math.ceil(calendarDays.length / 7);

  const monthTaskCount = useMemo(
    () =>
      calendarDays.reduce(
        (sum, day) =>
          sum +
          (isSameMonth(day, month) ? tasksByDate.get(dateKeyFromDate(day))?.length ?? 0 : 0),
        0,
      ),
    [calendarDays, month, tasksByDate],
  );

  // Rows share whatever height is left over, so pill capacity is a runtime measurement.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setRowHeight(el.clientHeight / weekCount);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [weekCount]);

  const pillSpace = rowHeight - CELL_PADDING - DAY_NUMBER_ROW;
  // How many pills fit when the day fits entirely, and when it needs a "+N more" link.
  const capacity = Math.max(MIN_VISIBLE_TASKS, Math.floor(pillSpace / PILL_HEIGHT));
  const capacityWithMore = Math.max(
    MIN_VISIBLE_TASKS,
    Math.floor((pillSpace - MORE_ROW_HEIGHT) / PILL_HEIGHT),
  );

  const addTaskOnDay = useCallback(
    (key: string) => openCalendarTaskDialog(key),
    [openCalendarTaskDialog],
  );

  // Month navigation from the keyboard, but only while the calendar owns the screen.
  useEffect(() => {
    if (dayModalDate !== null || taskDialogOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setMonth((m) => subMonths(m, 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setMonth((m) => addMonths(m, 1));
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setMonth(startOfMonth(new Date()));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dayModalDate, taskDialogOpen]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 pt-6 pb-4 shrink-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground mt-1 truncate">
              {monthTaskCount === 0
                ? "Nothing scheduled this month."
                : `${monthTaskCount} task${monthTaskCount === 1 ? "" : "s"} scheduled this month.`}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span
              className="min-w-[140px] text-center text-sm font-medium tabular-nums"
              aria-live="polite"
            >
              {format(month, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(startOfMonth(new Date()))}
            >
              Today
            </Button>
          </div>

          <div className="flex justify-end items-center gap-2">
            <DataExportImportActions />
          </div>
        </div>
      </div>

      {/* The month fills the remaining height; only a very short window scrolls. */}
      <div className="flex-1 min-h-0 overflow-y-auto themed-scrollbar px-8 pb-8">
        <div
          className="h-full flex flex-col rounded-xl border border-border/60 bg-card/30 overflow-hidden"
          style={{ minHeight: MIN_ROW_HEIGHT * weekCount + 36 }}
        >
          <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30 shrink-0">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          <div
            ref={gridRef}
            role="grid"
            aria-label={`${format(month, "MMMM yyyy")} calendar`}
            className="flex-1 min-h-0 grid grid-cols-7"
            style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
          >
            {calendarDays.map((day, index) => {
              const key = dateKeyFromDate(day);
              const dayTasks = tasksByDate.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const today = isToday(day);
              const weekend = index % 7 === 0 || index % 7 === 6;
              const lastColumn = index % 7 === 6;
              const lastRow = index >= calendarDays.length - 7;

              const visibleCount =
                dayTasks.length > capacity
                  ? Math.min(capacityWithMore, dayTasks.length - 1)
                  : dayTasks.length;
              const hiddenCount = dayTasks.length - visibleCount;

              const openDay = () => setDayModalDate(key);

              return (
                <div
                  key={key}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${format(day, "EEEE, MMMM d, yyyy")}, ${dayTasks.length} task${
                    dayTasks.length === 1 ? "" : "s"
                  }`}
                  onClick={openDay}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDay();
                    }
                  }}
                  className={cn(
                    "group/day relative min-h-0 p-1.5 border-b border-r border-border/40 text-left cursor-pointer transition-colors",
                    "flex flex-col items-stretch overflow-hidden",
                    "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    lastColumn && "border-r-0",
                    lastRow && "border-b-0",
                    weekend && "bg-muted/15",
                    !inMonth && "bg-muted/25 text-muted-foreground/60",
                    inMonth && !weekend && "bg-card/30",
                    today && (inMonth ? "bg-primary/5" : "bg-primary/[0.03]"),
                  )}
                >
                  <div className="flex items-center justify-between shrink-0 mb-1">
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums size-6 inline-flex items-center justify-center rounded-full",
                        today && inMonth && "bg-primary text-primary-foreground",
                        today && !inMonth && "ring-1 ring-primary/40 text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addTaskOnDay(key);
                      }}
                      aria-label={`Add task on ${format(day, "MMMM d, yyyy")}`}
                      className={cn(
                        "size-5 rounded inline-flex items-center justify-center text-muted-foreground",
                        "opacity-0 group-hover/day:opacity-100 focus-visible:opacity-100",
                        "hover:bg-accent hover:text-foreground transition-opacity",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-0.5 w-full min-h-0 flex-1 overflow-hidden">
                    {dayTasks.slice(0, visibleCount).map((task) => (
                      <DayTaskPill
                        key={task.id}
                        task={task}
                        group={groupById.get(task.groupId)}
                        selected={selectedTaskId === task.id}
                        onSelect={selectCalendarTask}
                      />
                    ))}
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDay();
                        }}
                        className={cn(
                          "shrink-0 text-[10px] text-muted-foreground px-1 text-left rounded",
                          "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        )}
                      >
                        +{hiddenCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CalendarDayDialog
        dateKey={dayModalDate}
        tasks={dayModalTasks}
        groupById={groupById}
        onClose={() => setDayModalDate(null)}
      />
    </div>
  );
};
