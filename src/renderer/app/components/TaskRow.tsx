import { motion, Variants } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
    zIndex: isDragging ? 50 : undefined,
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.25,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      height: 0,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
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
      variants={itemVariants}
      exit="exit"
      onClick={() => selectTask(task.id)}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative flex items-start gap-3 px-3 cursor-grab active:cursor-grabbing transition-colors",
        density === "compact" && "py-1.5",
        density === "comfortable" && "py-3",
        density === "spacious" && "py-4",
        "hover:bg-accent/40",
        selected && "bg-accent/60",
        isDragging && "shadow-lg bg-background ring-1 ring-border/50 scale-[1.02] z-50",
      )}
    >
      <div className="pt-0.5 relative z-10" onClick={(e) => e.stopPropagation()}>
        <TaskCheckbox
          checked={done}
          onToggle={() => toggle(task.id)}
          accent={accent}
        />
      </div>

      <div className="flex-1 min-w-0 pointer-events-none">
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
