import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, Plus } from "lucide-react";
import type { TaskStatus, AccentColor } from "../types";
import { useStore } from "../store/useStore";
import { TaskCheckbox } from "./TaskCheckbox";
import { TagBadge } from "./TagBadge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { toDateInputValue, fromDateInputValue, relativeFromNow } from "../lib/date";
import { cn } from "./ui/utils";

interface Props {
  accent: AccentColor;
}

export const TaskDetailPanel = ({ accent }: Props) => {
  const selectedId = useStore((s) => s.selectedTaskId);
  const close = useStore((s) => s.selectTask);
  const task = useStore((s) => s.tasks.find((t) => t.id === selectedId) ?? null);

  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const toggleDone = useStore((s) => s.toggleTaskDone);
  const addSubtask = useStore((s) => s.addSubtask);
  const toggleSubtask = useStore((s) => s.toggleSubtask);
  const deleteSubtask = useStore((s) => s.deleteSubtask);
  const updateSubtask = useStore((s) => s.updateSubtask);
  const addTag = useStore((s) => s.addTagToTask);
  const removeTag = useStore((s) => s.removeTagFromTask);
  const confirmDelete = useStore((s) => s.settings.confirmDelete);

  const [tagInput, setTagInput] = useState("");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    setTitle(task?.title ?? "");
    setTagInput("");
    setSubtaskInput("");
  }, [task?.id]);

  const open = Boolean(task);

  return (
    <AnimatePresence>
      {open && task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => close(null)}
            className="absolute inset-0 bg-foreground/5 z-30"
          />
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-0 bottom-0 w-[480px] max-w-[92vw] bg-card border-l border-border z-40 flex flex-col"
            style={{ borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-border">
              <span className="text-sm text-muted-foreground">
                Created {relativeFromNow(new Date(task.createdAt).toISOString())}
              </span>
              <div className="flex items-center gap-1">
                {confirmDelete ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label="Delete task"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{task.title}" will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTask(task.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => close(null)}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              <div className="flex items-start gap-3">
                <div className="pt-2">
                  <TaskCheckbox
                    checked={task.status === "done"}
                    onToggle={() => toggleDone(task.id)}
                    accent={accent}
                  />
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => {
                    const trimmed = title.trim();
                    if (trimmed && trimmed !== task.title) {
                      updateTask(task.id, { title: trimmed });
                    } else if (!trimmed) {
                      setTitle(task.title);
                    }
                  }}
                  className={cn(
                    "border-0 bg-transparent px-0 h-auto py-1 focus-visible:ring-0",
                    task.status === "done" && "line-through text-muted-foreground",
                  )}
                  style={{ fontSize: "1.125rem" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="task-status" className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={task.status}
                    onValueChange={(v) => updateTask(task.id, { status: v as TaskStatus })}
                  >
                    <SelectTrigger id="task-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To-Do</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-due" className="text-xs text-muted-foreground">
                    Due date
                  </Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={toDateInputValue(task.dueDate)}
                    onChange={(e) =>
                      updateTask(task.id, { dueDate: fromDateInputValue(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {task.tags.map((t) => (
                    <TagBadge key={t} tag={t} onRemove={() => removeTag(task.id, t)} />
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        addTag(task.id, tagInput);
                        setTagInput("");
                      }
                    }}
                    placeholder="Add tag…"
                    className="bg-transparent outline-none text-sm px-2 h-7 min-w-[100px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-notes" className="text-xs text-muted-foreground">
                  Notes
                </Label>
                <Textarea
                  id="task-notes"
                  value={task.notes}
                  onChange={(e) => updateTask(task.id, { notes: e.target.value })}
                  placeholder="Add notes, context, or links…"
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Subtasks ({task.subtasks.filter((s) => s.done).length}/{task.subtasks.length})
                </Label>
                <div className="space-y-1">
                  {task.subtasks.map((st) => (
                    <div key={st.id} className="group flex items-center gap-2 pl-1">
                      <TaskCheckbox
                        checked={st.done}
                        onToggle={() => toggleSubtask(task.id, st.id)}
                        accent={accent}
                        size="sm"
                      />
                      <input
                        defaultValue={st.title}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== st.title) updateSubtask(task.id, st.id, v);
                        }}
                        className={cn(
                          "flex-1 bg-transparent outline-none py-1 text-sm",
                          st.done && "line-through text-muted-foreground",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => deleteSubtask(task.id, st.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        aria-label="Delete subtask"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pl-1">
                    <div className="size-4 rounded-full border-2 border-dashed border-border flex items-center justify-center shrink-0">
                      <Plus className="size-2.5 text-muted-foreground" />
                    </div>
                    <input
                      value={subtaskInput}
                      onChange={(e) => setSubtaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && subtaskInput.trim()) {
                          e.preventDefault();
                          addSubtask(task.id, subtaskInput.trim());
                          setSubtaskInput("");
                        }
                      }}
                      placeholder="Add subtask…"
                      className="flex-1 bg-transparent outline-none py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
