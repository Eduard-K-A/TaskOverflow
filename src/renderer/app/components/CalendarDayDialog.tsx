import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useStore } from "../store/useStore";
import { ACCENT_PALETTE } from "../lib/tokens";
import { dateFromDateKey } from "../lib/date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { TaskCheckbox } from "./TaskCheckbox";
import { cn } from "./ui/utils";
import type { Group, Task } from "../types";

interface Props {
  dateKey: string | null;
  tasks: Task[];
  groupById: Map<string, Group>;
  onClose: () => void;
}

export const CalendarDayDialog = ({ dateKey, tasks, groupById, onClose }: Props) => {
  const selectCalendarTask = useStore((s) => s.selectCalendarTask);
  const openCalendarTaskDialog = useStore((s) => s.openCalendarTaskDialog);
  const toggleTaskDone = useStore((s) => s.toggleTaskDone);
  const selectedTaskId = useStore((s) => s.selectedTaskId);

  const open = dateKey !== null;
  const label = dateKey ? format(dateFromDateKey(dateKey), "EEEE, MMMM d, yyyy") : "";
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const handleAddTask = () => {
    if (!dateKey) return;
    onClose();
    openCalendarTaskDialog(dateKey);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[720px] w-[94vw] max-h-[88vh] flex flex-col gap-5 p-8">
        <DialogHeader className="shrink-0">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {tasks.length === 0
              ? "No tasks due on this date."
              : `${tasks.length} task${tasks.length === 1 ? "" : "s"} due · ${doneCount} complete`}
          </DialogDescription>
        </DialogHeader>

        {tasks.length > 0 ? (
          <ul className="flex-1 min-h-0 max-h-[min(58vh,560px)] overflow-y-auto themed-scrollbar rounded-xl border border-border/60 divide-y divide-border/40">
            {tasks.map((task) => {
              const group = groupById.get(task.groupId);
              const accent = ACCENT_PALETTE[group?.accent ?? "blue"] ?? ACCENT_PALETTE.blue;
              const done = task.status === "done";

              return (
                <li
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
                    selectedTaskId === task.id && "bg-accent/40",
                  )}
                >
                  <div className="pt-0.5 shrink-0">
                    <TaskCheckbox
                      checked={done}
                      onToggle={() => toggleTaskDone(task.id)}
                      accent={group?.accent ?? "blue"}
                      size="sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      selectCalendarTask(task.id);
                      onClose();
                    }}
                    className="min-w-0 flex-1 text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        done && "line-through text-muted-foreground",
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span className={cn("size-1.5 rounded-full shrink-0", accent.fill)} />
                      {group?.name ?? "Unknown group"} · {done ? "Done" : "To-Do"}
                    </p>
                    {task.notes && (
                      <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                        {task.notes}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
            Nothing scheduled yet.
          </div>
        )}

        <Button type="button" className="w-full shrink-0" onClick={handleAddTask}>
          <Plus className="size-4 mr-2" />
          Add task
        </Button>
      </DialogContent>
    </Dialog>
  );
};
