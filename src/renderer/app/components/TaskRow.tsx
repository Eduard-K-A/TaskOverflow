import { motion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Task, AccentColor } from "../types";
import { useStore } from "../store/useStore";
import { TaskCheckbox } from "./TaskCheckbox";
import { DueDateLabel } from "./DueDateLabel";
import { TagBadge } from "./TagBadge";
import { cn } from "./ui/utils";

interface Props {
  task: Task;
  accent: AccentColor;
}

export const TaskRow = ({ task, accent }: Props) => {
  const toggle = useStore((s) => s.toggleTaskDone);
  const selectTask = useStore((s) => s.selectTask);
  const selected = useStore((s) => s.selectedTaskId === task.id);
  const density = useStore((s) => s.settings.density);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const subtaskProgress =
    task.subtasks.length > 0
      ? `${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length}`
      : null;

  const done = task.status === "done";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => selectTask(task.id)}
      className={cn(
        "group relative flex items-start gap-3 px-3 cursor-pointer transition-colors",
        density === "compact" && "py-1.5",
        density === "comfortable" && "py-3",
        density === "spacious" && "py-4",
        "hover:bg-accent/40",
        selected && "bg-accent/60",
        isDragging && "opacity-50 z-10",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing self-center -ml-1"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </button>

      <div className="pt-0.5">
        <TaskCheckbox
          checked={done}
          onToggle={() => toggle(task.id)}
          accent={accent}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "truncate",
              done && "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <DueDateLabel iso={task.dueDate} done={done} />
          {subtaskProgress && (
            <span className="text-xs text-muted-foreground tabular-nums">
              ☑ {subtaskProgress}
            </span>
          )}
          {task.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{task.tags.length - 3}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
